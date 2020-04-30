"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm = require("vm");
class Executor {
    constructor(publicPath, loadModule, resolveModule) {
        this.publicPath = publicPath;
        this.loadModule = loadModule;
        this.resolveModule = resolveModule;
    }
    static generateRandomPlaceholder() {
        // Its better to use uncommon characters for this.
        return `__EXECUTOR_PLACEHOLDER_${Executor._currentId++}__`;
    }
    evaluateCode($context, $source, $fileName) {
        if (!Executor.executionCache.hasOwnProperty($source)) {
            const script = new vm.Script($source, {
                filename: $fileName,
                displayErrors: true,
            });
            const sandbox = vm.createContext({
                // ...global,
                module: { exports: {} },
                __webpack_public_path__: this.publicPath,
            });
            script.runInContext(sandbox);
            // Save to cache...
            Executor.executionCache[$source] = sandbox['module'] && sandbox['module']['exports'];
        }
        return Executor.executionCache[$source];
    }
    resolveAndExecute($context, $request) {
        return new Promise(($promiseResolveFn, $promiseRejectFn) => {
            this.resolveModule($context, $request, ($err, $result) => {
                if ($err) {
                    $promiseRejectFn($err);
                }
                else {
                    this.loadModule($result, ($err, $source, $sourceMap, $module) => {
                        if ($err) {
                            $promiseRejectFn($err);
                        }
                        else {
                            $promiseResolveFn(
                            // webpack.Module has incorrect typings, it should be NormalModule...
                            this.evaluateCode($context, $source, $module['resource'] + '.js'));
                        }
                    });
                }
            });
        });
    }
}
exports.Executor = Executor;
Executor._currentId = 1;
Executor.executionCache = {};
//# sourceMappingURL=executor.js.map