import * as loaderUtils from 'loader-utils';
import {DomElement} from 'htmlparser2';
import * as webpack from "webpack";
import {RawSourceMap} from "source-map";
import {DomRenderer} from "./renderer";
import {Executor} from "./executor";
import * as path from "path";
import {stringToDom} from "./utils";
import {MutationRule, rulesFactory} from "./rules";

type ContextOptions = {
    executor: Executor,
    context: string,
}

function applyRule(
    $node: DomElement,
    $rule: MutationRule,
    $options: ContextOptions
): Promise<DomElement | Array<DomElement>> {
    if ($rule.test($node)) {
        const requiredPath = $rule.extract($node);
        const isAbsoluteUrl = /^\w*:\/\//.test(requiredPath);
        if (!isAbsoluteUrl) {
            const isAbsolutePath = /^\//.test(requiredPath);
            if (!isAbsolutePath) {
                return $options.executor
                    .resolveAndExecute(
                        $options.context,
                        './' + path.relative($options.context, path.join($options.context, requiredPath))
                    )
                    .then($ => {
                        if (typeof $ !== 'string') {
                            throw Error('Resolved module content must be string.');
                        }
                        return $rule.apply($node, $);
                    })
            }
        }
    }
    return Promise.resolve($node);
}

function applyRules(
    $node: DomElement,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<DomElement | Array<DomElement>> {
    const rulesToApply = $rules.concat();
    const constructNextHandler = ($resultNode: DomElement | Array<DomElement>) => {
        if (rulesToApply.length > 0) {
            const ruleToApply = rulesToApply.shift();

            if (Array.isArray($resultNode)) {
                return Promise
                    .all($resultNode.map($ => {
                        return applyRule($, ruleToApply, $options);
                    }))
                    .then(($: Array<DomElement | Array<DomElement>>): Array<DomElement> => {
                        // Structure should be flattened.
                        return $.reduce<Array<DomElement>>(($acc: Array<DomElement>, $current) => {
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
    $node: DomElement,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<DomElement | Array<DomElement>> {
    return applyRules($node, $rules, $options)
        .then($mutated => {
            if (
                !Array.isArray($mutated)
                && ($mutated === $node || $mutated.children === $node.children)
                && Array.isArray($mutated.children) && $mutated.children.length > 0
            ) {
                return processNodes($mutated.children, $rules, $options)
                    .then($processedChildren => {
                        $mutated.children = $processedChildren;
                        return $mutated;
                    });
            }
            return $mutated;
        });
}

function processNodes(
    $nodes: Array<DomElement>,
    $rules: Array<MutationRule>,
    $options: ContextOptions
): Promise<Array<DomElement>> {
    return Promise
        .all(
            $nodes.map($ => processNode($, $rules, $options))
        ).then(($: Array<DomElement | Array<DomElement>>): Array<DomElement> => {
            return $.reduce<Array<DomElement>>(($acc: Array<DomElement>, $current) => {
                return $acc.concat($current);
            }, []);
        });
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
        const rules: Array<MutationRule> = rulesFactory(options.rules);

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
        // This could be improved using this.inputValue and this.value. Not sure if this works in webpack v3.
        stringToDom($source)
            .then(($domElements) => {
                const contextOptions: ContextOptions = {
                    context: this.context,
                    executor: new Executor(publicPath, this.loadModule, this.resolve),
                };

                return processNodes($domElements, rules, contextOptions);
            })
            .then(($processedDomElements: Array<DomElement>) => {
                const renderer = new DomRenderer();
                // FIXME: Also share meta data!
                callbackFn(null, renderer.renderElements($processedDomElements));
            })
            .catch($error => {
                callbackFn($error);
            });
    }
    return $source;
};

module.exports = htmlResourceLoader;
