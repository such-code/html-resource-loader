"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loaderUtils = require("loader-utils");
const renderer_1 = require("./renderer");
const executor_1 = require("./executor");
const path = require("path");
const utils_1 = require("./utils");
const rules_1 = require("./rules");
function applyRule($node, $rule, $options) {
    if ($rule.test($node)) {
        const requiredPath = $rule.extract($node);
        const isAbsoluteUrl = /^\w*:\/\//.test(requiredPath);
        if (!isAbsoluteUrl) {
            const isAbsolutePath = /^\//.test(requiredPath);
            if (!isAbsolutePath) {
                return $options.executor
                    .resolveAndExecute($options.context, './' + path.relative($options.context, path.join($options.context, requiredPath)))
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
        .then($mutated => {
        if (!Array.isArray($mutated)
            && ($mutated === $node || $mutated.children === $node.children)
            && Array.isArray($mutated.children) && $mutated.children.length > 0) {
            return processNodes($mutated.children, $rules, $options)
                .then($processedChildren => {
                $mutated.children = $processedChildren;
                return $mutated;
            });
        }
        return $mutated;
    });
}
function processNodes($nodes, $rules, $options) {
    return Promise
        .all($nodes.map($ => processNode($, $rules, $options))).then(($) => {
        return $.reduce(($acc, $current) => {
            return $acc.concat($current);
        }, []);
    });
}
const htmlResourceLoader = function htmlResourceLoaderFn($source, $sourceMap, 
// FIXME: Add meta handling in case it contains already modified HTML Ast!!!
$meta) {
    const options = loaderUtils.getOptions(this);
    if (!('rules' in options)) {
        this.emitWarning(Error('Rules should be configured form html resource loader to take effect.'));
        return $source;
    }
    else if (!Array.isArray(options.rules)) {
        this.emitError(Error('Loader rules must be an array of objects.'));
        return undefined;
    }
    if (typeof $source === 'string' || $source instanceof Buffer) {
        if ($source instanceof Buffer) {
            $source = $source.toString();
        }
        // Normalize provided rules.
        const rules = rules_1.rulesFactory(options.rules);
        // Become async.
        const callbackFn = this.async();
        // Determine public path
        const publicPath = 'publicPath' in options
            ? (typeof options.publicPath === 'function' ? options.publicPath(this.context) : options.publicPath)
            : (
            // This solution is based on deprecated methods but it is the only option to get public path.
            this._compilation && this._compilation.outputOptions && 'publicPath' in this._compilation.outputOptions
                ? this._compilation.outputOptions.publicPath
                : '');
        // Parsing DOM
        // This could be improved using this.inputValue and this.value. Not sure if this works in webpack v3.
        utils_1.stringToDom($source)
            .then(($domElements) => {
            const contextOptions = {
                context: this.context,
                executor: new executor_1.Executor(publicPath, this.loadModule, this.resolve),
            };
            return processNodes($domElements, rules, contextOptions);
        })
            .then(($processedDomElements) => {
            const renderer = new renderer_1.DomRenderer();
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
//# sourceMappingURL=index.js.map