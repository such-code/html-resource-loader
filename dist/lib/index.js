"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loaderUtils = require("loader-utils");
const htmlparser2_1 = require("htmlparser2");
const renderer_1 = require("./renderer");
const executor_1 = require("./executor");
const rules_1 = require("./rules");
const path = require("path");
function processAttribute($name, $value, $options) {
    const isAbsoluteUrl = /^\w*:\/\//.test($value);
    if (!isAbsoluteUrl) {
        const isAbsolutePath = /^\//.test($value);
        if (!isAbsolutePath) {
            return $options.executor
                .resolveAndExecute($options.context, './' + path.relative($options.context, path.join($options.context, $value)))
                .then($ => ({
                [$name]: $,
            }));
        }
    }
    return Promise.resolve({ [$name]: $value });
}
function applyRule($node, $rule, $options) {
    if ($node.type === 'tag' && 'attribs' in $node) {
        const tagMatches = $rule.tag.findIndex($tagPattern => $tagPattern.test($node.name)) > -1;
        if (tagMatches) {
            const attributesToHandle = Object.keys($node.attribs)
                .filter($attr => {
                return $rule.attr.findIndex($attrPattern => $attrPattern.test($attr)) > -1;
            });
            if (attributesToHandle.length > 0) {
                return Promise.all(attributesToHandle.map($attr => processAttribute($attr, $node.attribs[$attr], $options))).then($proceedAttributes => {
                    $node.attribs = Object.assign({}, $node.attribs, $proceedAttributes.reduce(($acc, $currentValue) => (Object.assign({}, $acc, $currentValue)), {}));
                    return $node;
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
function processNode($node, $rules, $options) {
    return applyRules($node, $rules, $options)
        .then($checkedNode => {
        // If required process child nodes.
        if (Array.isArray($node.children) && $node.children.length > 0) {
            return processNodes($node.children, $rules, $options)
                .then($processedChildren => {
                $node.children = $processedChildren;
                return $node;
            });
        }
        return $checkedNode;
    });
}
function processNodes($nodes, $rules, $options) {
    return Promise.all($nodes.map($ => processNode($, $rules, $options)));
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
        const rules = rules_1.normalizeRuleObjects(options.rules);
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
        const parser = new htmlparser2_1.Parser(new htmlparser2_1.DomHandler(($error, $domElements) => {
            if ($error) {
                callbackFn($error);
            }
            else {
                const contextOptions = {
                    context: this.context,
                    executor: new executor_1.Executor(publicPath, this.loadModule, this.resolve),
                };
                processNodes($domElements, rules, contextOptions)
                    .then(($processedDomElements) => {
                    const renderer = new renderer_1.DomRenderer();
                    // FIXME: Also share meta data!
                    callbackFn(null, renderer.renderElements($processedDomElements));
                })
                    .catch($error => {
                    callbackFn($error);
                });
            }
        }), {
            lowerCaseTags: false,
            lowerCaseAttributeNames: false
        });
        // This could be improved using this.inputValue and this.value. Not sure if this works in webpack v3.
        parser.parseComplete($source);
    }
    return $source;
};
module.exports = htmlResourceLoader;
//# sourceMappingURL=index.js.map