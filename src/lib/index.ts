import { DomRenderer, isElement, isNodeWithChildren, stringToDom } from '@such-code/html-parser-utils';
import { DomHandlerOptions, Node } from 'domhandler/lib';
import { ParserOptions } from 'htmlparser2';
import * as loaderUtils from 'loader-utils';
import { RawSourceMap } from 'source-map';
import * as webpack from 'webpack';
import { Rule } from './rules-configuration';
import { convertToMutationRules, MutationRule } from './rules-internal';
import { CodeExecutor, isArrayOfNodes, isHtmlResourceLoaderOptions, WebpackLoader, WebpackResolver } from './utils';

type ContextOptions = {
    context: string,
    loader: WebpackLoader,
    resolver: WebpackResolver,
    executor: CodeExecutor,
}

function applyRule(
    $node: Node,
    $rule: MutationRule,
    $options: ContextOptions
): Promise<Node | Array<Node>> {
    // Only elements are processed.
    if (isElement($node) && $rule.test($node)) {
        const requiredPath = $rule.extract($node);
        const isAbsoluteUrl = /^([a-z]+:)?\/\//i.test(requiredPath);
        if (!isAbsoluteUrl) {
            const isAbsolutePath = /^\//.test(requiredPath);
            if (!isAbsolutePath) {
                return Promise.resolve()
                    .then(() => {
                        if ($rule.hasResolver) {
                            return $rule.resolve($options.context, requiredPath);
                        }
                        return $options.resolver
                            .resolve($options.context, requiredPath)
                            .catch($err => {
                                // Retry to force relative path resolution.
                                if (!/^\.{1,2}\//.test(requiredPath)) {
                                    return $options.resolver
                                        .resolve($options.context, './' + requiredPath)
                                        .catch(() => {
                                            throw $err;
                                        });
                                }
                                throw $err;
                            });
                    })
                    .then($ => $options.loader.load($))
                    .then($ => {
                        return $options.executor
                            .evaluateCode<string>(
                                $options.context,
                                $.source,
                                // Module type definitions are incorrect.
                                $.module['resource'] + '.js',
                            );
                    })
                    .then($ => {
                        if (typeof $ !== 'string') {
                            throw Error('Resolved module content must be string.');
                        }
                        return $rule.apply($node, $);
                    });
            }
        }
    }
    return Promise.resolve($node);
}

function applyRules(
    $node: Node,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<Node | Array<Node>> {
    const rulesToApply = $rules.concat();
    const constructNextHandler = ($resultNode: Node | Array<Node>) => {
        if (rulesToApply.length > 0) {
            const ruleToApply = rulesToApply.shift();

            if (Array.isArray($resultNode)) {
                return Promise
                    .all($resultNode.map($ => {
                        return applyRule($, ruleToApply, $options);
                    }))
                    .then(($: Array<Node | Array<Node>>): Array<Node> => {
                        // Structure should be flattened.
                        return $.reduce<Array<Node>>(($acc: Array<Node>, $current) => {
                            return $acc.concat($current);
                        }, [])
                    })
                    .then(constructNextHandler);
            }
            return applyRule($resultNode, ruleToApply, $options)
                // Promise recursion
                .then(constructNextHandler);
        }
        return $resultNode;
    };

    return Promise
        .resolve($node)
        .then(constructNextHandler);
}

function processNode(
    $node: Node,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<Node | Array<Node>> {
    return applyRules($node, $rules, $options)
        .then(($mutated: Node | Array<Node>) => {
            if (
                isNodeWithChildren($node)
                && isNodeWithChildren($mutated)
                // if $mutated is an array - then it is already processed (tag was replaced with different content)
                && !Array.isArray($mutated)
                // process children only if they are same
                && ($mutated === $node || $mutated.childNodes === $node.childNodes)
                && Array.isArray($mutated.childNodes)
                && $mutated.childNodes.length > 0
            ) {
                return processNodes($mutated.childNodes, $rules, $options)
                    .then($processedChildren => {
                        $mutated.childNodes = $processedChildren;
                        return $mutated;
                    });
            }
            return $mutated;
        });
}

function processNodes(
    $nodes: Array<Node>,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<Array<Node>> {
    return Promise
        .all($nodes.map($ => processNode($, $rules, $options)))
        .then(($: Array<Node | Array<Node>>): Array<Node> => {
            return $.reduce<Array<Node>>(($acc: Array<Node>, $current) => {
                return $acc.concat($current);
            }, []);
        });
}

export type HtmlResourceLoaderOptions = {
    rules: Array<Rule>,
    publicPath?: string | (($context: string) => string),
    htmlParserOptions?: ParserOptions,
    domHandlerOptions?: DomHandlerOptions,
}

module.exports = <webpack.loader.Loader>function htmlResourceLoaderFn(
    $source: string,
    $sourceMap?: RawSourceMap,
    // FIXME: Add meta handling in case it contains already modified HTML Ast!!!
    $meta?: any
): string | undefined | void {
    const options = loaderUtils.getOptions(this);

    if (isHtmlResourceLoaderOptions(options)) {
        if (typeof $source === 'string') {
            // Normalize provided rules.
            const rules: Array<MutationRule> = convertToMutationRules(options.rules);

            // Become async.
            const callbackFn: ($err: Error | null, content?: string, sourceMap?: RawSourceMap, $meta?: any) => void = this.async();

            // Determine public path (is required to execute loaded module)
            const publicPath = 'publicPath' in options
                ? (typeof options.publicPath === 'function' ? options.publicPath(this.context) : options.publicPath)
                : (
                    // This solution is based on deprecated methods but it is the only option to get public path.
                    this._compilation && this._compilation.outputOptions && 'publicPath' in this._compilation.outputOptions
                        ? this._compilation.outputOptions.publicPath
                        : ''
                );

            // Check is $meta already has parsed AST.
            const dom: Promise<Array<Node>> = isArrayOfNodes($meta)
                ? Promise.resolve($meta)
                : stringToDom($source, options.htmlParserOptions);

            // Process AST
            dom
                .then(($domElements: Array<Node>) => {
                    const contextOptions: ContextOptions = {
                        context: this.context,
                        loader: new WebpackLoader(this.loadModule),
                        resolver: new WebpackResolver(this.resolve),
                        executor: new CodeExecutor(publicPath),
                    };

                    return processNodes($domElements, rules, contextOptions);
                })
                .then(($processedDomElements: Array<Node>) => {
                    const renderer = new DomRenderer();
                    callbackFn(null, renderer.renderNodes($processedDomElements), $sourceMap, $processedDomElements);
                })
                .catch($error => {
                    callbackFn($error);
                });
        }
    } else {
        // TODO: Check what exactly is wrong.
        this.emitError(Error('Loader options are configured incorrectly.'));
    }
    return $source;
};
