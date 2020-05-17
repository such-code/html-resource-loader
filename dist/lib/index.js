"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const html_parser_utils_1 = require("@such-code/html-parser-utils");
const loaderUtils = require("loader-utils");
const rules_internal_1 = require("./rules-internal");
const utils_1 = require("./utils");
function applyRule($node, $rule, $options) {
    // Only elements are processed.
    if (html_parser_utils_1.isElement($node) && $rule.test($node)) {
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
                        .evaluateCode($options.context, $.source, 
                    // Module type definitions are incorrect.
                    $.module['resource'] + '.js');
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
function applyRules($node, $rules, $options) {
    const rulesToApply = $rules.concat();
    const constructNextHandler = ($resultNode) => {
        if (rulesToApply.length > 0) {
            const ruleToApply = rulesToApply.shift();
            if (Array.isArray($resultNode)) {
                return Promise
                    .all($resultNode.map($ => {
                    return applyRule($, ruleToApply, $options);
                }))
                    .then(($) => {
                    // Structure should be flattened.
                    return $.reduce(($acc, $current) => {
                        return $acc.concat($current);
                    }, []);
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
function processNode($node, $rules, $options) {
    return applyRules($node, $rules, $options)
        .then(($mutated) => {
        if (html_parser_utils_1.isNodeWithChildren($node)
            && html_parser_utils_1.isNodeWithChildren($mutated)
            // if $mutated is an array - then it is already processed (tag was replaced with different content)
            && !Array.isArray($mutated)
            // process children only if they are same
            && ($mutated === $node || $mutated.childNodes === $node.childNodes)
            && Array.isArray($mutated.childNodes)
            && $mutated.childNodes.length > 0) {
            return processNodes($mutated.childNodes, $rules, $options)
                .then($processedChildren => {
                $mutated.childNodes = $processedChildren;
                return $mutated;
            });
        }
        return $mutated;
    });
}
function processNodes($nodes, $rules, $options) {
    return Promise
        .all($nodes.map($ => processNode($, $rules, $options)))
        .then(($) => {
        return $.reduce(($acc, $current) => {
            return $acc.concat($current);
        }, []);
    });
}
module.exports = function htmlResourceLoaderFn($source, $sourceMap, 
// FIXME: Add meta handling in case it contains already modified HTML Ast!!!
$meta) {
    const options = loaderUtils.getOptions(this);
    if (utils_1.isHtmlResourceLoaderOptions(options)) {
        if (typeof $source === 'string') {
            // Normalize provided rules.
            const rules = rules_internal_1.convertToMutationRules(options.rules);
            // Become async.
            const callbackFn = this.async();
            // Determine public path (is required to execute loaded module)
            const publicPath = 'publicPath' in options
                ? (typeof options.publicPath === 'function' ? options.publicPath(this.context) : options.publicPath)
                : (
                // This solution is based on deprecated methods but it is the only option to get public path.
                this._compilation && this._compilation.outputOptions && 'publicPath' in this._compilation.outputOptions
                    ? this._compilation.outputOptions.publicPath
                    : '');
            // Check is $meta already has parsed AST.
            const dom = utils_1.isArrayOfNodes($meta) ? Promise.resolve($meta) : html_parser_utils_1.stringToDom($source);
            // Process AST
            dom
                .then(($domElements) => {
                const contextOptions = {
                    context: this.context,
                    loader: new utils_1.WebpackLoader(this.loadModule),
                    resolver: new utils_1.WebpackResolver(this.resolve),
                    executor: new utils_1.CodeExecutor(publicPath),
                };
                return processNodes($domElements, rules, contextOptions);
            })
                .then(($processedDomElements) => {
                const renderer = new html_parser_utils_1.DomRenderer();
                callbackFn(null, renderer.renderNodes($processedDomElements), $sourceMap, $processedDomElements);
            })
                .catch($error => {
                callbackFn($error);
            });
        }
    }
    else {
        // TODO: Check what exactly is wrong.
        this.emitError(Error('Loader options are configured incorrectly.'));
    }
    return $source;
};
