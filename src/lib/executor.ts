import * as vm from "vm";
import {RawSourceMap} from "source-map";
import * as webpack from "webpack";

export type ResolveFn = (
    $context: string,
    $request: string,
    $callback: (
        $err: Error,
        $result: string
    ) => void
) => any;

export type LoadModuleFn = (
    $request: string,
    $callback: (
        $err: Error | null,
        $source: string,
        $sourceMap: RawSourceMap,
        $module: webpack.Module
    ) => void
) => any;

type commonExecutionContext = {
    module: {
        exports: any
    }
}

export class Executor {
    protected static _currentId = 1;

    protected static generateRandomPlaceholder(): string {
        // Its better to use uncommon characters for this.
        return `__EXECUTOR_PLACEHOLDER_${ Executor._currentId++ }__`;
    }

    static readonly executionCache: { [code: string]: any } = {};

    public constructor(
        protected readonly publicPath: string,
        protected readonly loadModule: LoadModuleFn,
        protected readonly resolveModule: ResolveFn,
    ) { }

    protected evaluateCode<T>($context: string, $source: string, $fileName: string): T {
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

    public resolveAndExecute<T = any>($context: string, $request: string): Promise<T> {
        return new Promise(($promiseResolveFn, $promiseRejectFn) => {
            this.resolveModule($context, $request, ($err, $result) => {
                if ($err) {
                    $promiseRejectFn($err);
                } else {
                    this.loadModule($result, ($err, $source, $sourceMap, $module: webpack.Module) => {
                        if ($err) {
                            $promiseRejectFn($err);
                        } else {
                            $promiseResolveFn(
                                // webpack.Module has incorrect typings, it should be NormalModule...
                                this.evaluateCode($context, $source, $module['resource'] + '.js')
                            );
                        }
                    });
                }
            });
        });
    }
}
