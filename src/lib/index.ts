import * as loaderUtils from 'loader-utils';
import {DomElement, DomHandler, Parser} from 'htmlparser2';
import * as webpack from "webpack";
import {RawSourceMap} from "source-map";
import {DomRenderer} from "./renderer";
import {Executor} from "./executor";
import {NormalizedRule, normalizeRuleObjects} from "./rules";
import * as path from "path";

type ContextOptions = {
    executor: Executor,
    context: string,
}

function processAttribute($name: string, $value: string, $options: ContextOptions): Promise<{ [key: string]: any }> {
    const isAbsoluteUrl = /^\w*:\/\//.test($value);
    if (!isAbsoluteUrl) {
        const isAbsolutePath = /^\//.test($value);
        if (!isAbsolutePath) {
            return $options.executor
                .resolveAndExecute(
                    $options.context,
                    './' + path.relative(
                        $options.context,
                        path.join($options.context, $value)
                    )
                )
                .then($ => ({
                    [$name]: $,
                }));
        }
    }
    return Promise.resolve({ [$name]: $value });
}

function applyRule($node: DomElement, $rule: NormalizedRule, $options: ContextOptions): Promise<DomElement> {
    if ($node.type === 'tag' && 'attribs' in $node) {
        const tagMatches = $rule.tag.findIndex($tagPattern => $tagPattern.test($node.name)) > -1;
        if (tagMatches) {
            const attributesToHandle = Object.keys($node.attribs)
                .filter($attr => {
                    return $rule.attr.findIndex($attrPattern => $attrPattern.test($attr)) > -1
                });

            if (attributesToHandle.length > 0) {
                return Promise.all(
                    attributesToHandle.map(
                        $attr => processAttribute($attr, $node.attribs[$attr], $options)
                    )
                ).then(
                    $proceedAttributes => {
                        $node.attribs = {
                            ...$node.attribs,
                            ...$proceedAttributes.reduce(($acc, $currentValue) => ({
                                ...$acc,
                                ...$currentValue,
                            }), {})
                        };
                        return $node;
                    }
                );
            }
        }
    }
    return Promise.resolve($node);
}

function applyRules($node: DomElement, $rules: Array<NormalizedRule>, $options: ContextOptions): Promise<DomElement> {
    const rulesToApply = $rules.concat();
    const constructNextHandler = ($resultNode: DomElement) => {
        if (rulesToApply.length > 0) {
            return applyRule($resultNode, rulesToApply.shift(), $options)
                // Promise recursion
                .then(constructNextHandler);
        }
        return $resultNode;
    };

    return Promise
        .resolve($node)
        .then(constructNextHandler);
}

function processNode($node: DomElement, $rules: Array<NormalizedRule>, $options: ContextOptions): Promise<DomElement> {
    return applyRules($node, $rules, $options)
            .then($checkedNode => {
                // If required process child nodes.
                if (Array.isArray($node.children) && $node.children.length > 0) {
                    return processNodes($node.children, $rules, $options)
                        .then($processedChildren => {
                            $node.children = $processedChildren;
                            return $node;
                        })
                }

                return $checkedNode;
            });
}

function processNodes(
    $nodes: Array<DomElement>,
    $rules: Array<NormalizedRule>,
    $options: ContextOptions
): Promise<Array<DomElement>> {
    return Promise.all(
        $nodes.map($ => processNode($, $rules, $options))
    );
}

const htmlResourceLoader: webpack.loader.Loader = function htmlResourceLoaderFn(
    $source: string | Buffer,
    $sourceMap?: RawSourceMap,
    // FIXME: Add meta handling in case it contains already modified HTML Ast!!!
    $meta?: any
): string | Buffer | void | undefined {
    const options = loaderUtils.getOptions(this);

    if (!('rules' in options)) {
        this.emitWarning(Error('Rules should be configured form html resource loader to take effect.'));
        return $source;
    } else if (!Array.isArray(options.rules)) {
        this.emitError(Error('Loader rules must be an array of objects.'));
        return undefined;
    }

    if (typeof $source === 'string' || $source instanceof Buffer) {
        if ($source instanceof Buffer) {
            $source = $source.toString();
        }

        // Normalize provided rules.
        const rules: Array<NormalizedRule> = normalizeRuleObjects(options.rules);

        // Become async.
        const callbackFn = this.async();

        // Determine public path
        const publicPath = 'publicPath' in options
            ? (typeof options.publicPath === 'function' ? options.publicPath(this.context) : options.publicPath)
            : (
                // This solution is based on deprecated methods but it is the only option to get public path.
                this._compilation && this._compilation.outputOptions && 'publicPath' in this._compilation.outputOptions
                    ? this._compilation.outputOptions.publicPath
                    : ''
            );

        // Parsing DOM
        const parser = new Parser(
            new DomHandler(($error: any, $domElements: Array<DomElement>) => {
                if ($error) {
                    callbackFn($error);
                } else {
                    const contextOptions: ContextOptions = {
                        context: this.context,
                        executor: new Executor(publicPath, this.loadModule, this.resolve),
                    };

                    processNodes($domElements, rules, contextOptions)
                        .then(($processedDomElements: Array<DomElement>) => {
                            const renderer = new DomRenderer();
                            // FIXME: Also share meta data!
                            callbackFn(null, renderer.renderElements($processedDomElements));
                        })
                        .catch($error => {
                            callbackFn($error);
                        });
                }
            }),
            {
                lowerCaseTags: false,
                lowerCaseAttributeNames: false
            }
        );
        // This could be improved using this.inputValue and this.value. Not sure if this works in webpack v3.
        parser.parseComplete($source);
    }
    return $source;
};

module.exports = htmlResourceLoader;
