import { RawSourceMap } from "source-map";
import * as webpack from "webpack";
export declare type ResolveFn = ($context: string, $request: string, $callback: ($err: Error, $result: string) => void) => any;
export declare type LoadModuleFn = ($request: string, $callback: ($err: Error | null, $source: string, $sourceMap: RawSourceMap, $module: webpack.Module) => void) => any;
export declare class Executor {
    protected readonly publicPath: string;
    protected readonly loadModule: LoadModuleFn;
    protected readonly resolveModule: ResolveFn;
    protected static _currentId: number;
    protected static generateRandomPlaceholder(): string;
    static readonly executionCache: {
        [code: string]: any;
    };
    constructor(publicPath: string, loadModule: LoadModuleFn, resolveModule: ResolveFn);
    protected evaluateCode<T>($context: string, $source: string, $fileName: string): T;
    resolveAndExecute<T = any>($context: string, $request: string): Promise<T>;
}
