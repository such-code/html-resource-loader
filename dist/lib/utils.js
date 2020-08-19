"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArrayOfNodes = exports.isHtmlResourceLoaderOptions = exports.CodeExecutor = exports.WebpackLoader = exports.WebpackResolver = void 0;
const vm = require("vm");
const html_parser_utils_1 = require("@such-code/html-parser-utils");
const rules_configuration_1 = require("./rules-configuration");
class WebpackResolver {
    constructor(resolveFn) {
        this.resolveFn = resolveFn;
    }
    resolve($context, $path) {
        return new Promise(($resolve, $reject) => {
            this.resolveFn($context, $path, ($err, $result) => {
                if ($err) {
                    $reject($err);
                }
                else {
                    $resolve($result);
                }
            });
        });
    }
}
exports.WebpackResolver = WebpackResolver;
class WebpackLoader {
    constructor(loadFn) {
        this.loadFn = loadFn;
    }
    load($path) {
        return new Promise(($resolve, $reject) => {
            this.loadFn($path, ($err, $source, $sourceMap, $module) => {
                if ($err) {
                    $reject($err);
                }
                else {
                    $resolve({
                        source: $source,
                        sourceMap: $sourceMap,
                        module: $module,
                    });
                }
            });
        });
    }
}
exports.WebpackLoader = WebpackLoader;
class CodeExecutor {
    constructor(publicPath) {
        this.publicPath = publicPath;
    }
    evaluateCode($context, $source, $fileName) {
        if (!CodeExecutor.executionCache.hasOwnProperty($source)) {
            const script = new vm.Script($source, {
                filename: $fileName,
                displayErrors: true,
            });
            const sandbox = vm.createContext({
                module: { exports: {} },
                __webpack_public_path__: this.publicPath,
            });
            script.runInContext(sandbox);
            // Save to cache.
            CodeExecutor.executionCache[$source] = sandbox['module'] && sandbox['module']['exports'];
        }
        // Return result from cache.
        return CodeExecutor.executionCache[$source];
    }
}
exports.CodeExecutor = CodeExecutor;
CodeExecutor.executionCache = {};
/**
 * Type guard to check if received loader options are HtmlResourceLoaderOptions.
 * @param $value
 * @returns boolean
 */
function isHtmlResourceLoaderOptions($value) {
    return typeof $value === 'object'
        && $value !== null
        && Array.isArray($value.rules)
        && $value.rules.every($ => rules_configuration_1.isRule($));
}
exports.isHtmlResourceLoaderOptions = isHtmlResourceLoaderOptions;
/**
 * Type guard to assure that $value is Array<Node>.
 * @param $value
 * @returns boolean
 */
function isArrayOfNodes($value) {
    // Only top level items are checked, no recursion here.
    return Array.isArray($value) && $value.every(html_parser_utils_1.isNode);
}
exports.isArrayOfNodes = isArrayOfNodes;
//# sourceMappingURL=utils.js.map