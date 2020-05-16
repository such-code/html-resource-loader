import * as webpack from 'webpack';
import { Node } from 'domhandler/lib/node';
import { HtmlResourceLoaderOptions } from './index';
import { RawSourceMap } from 'source-map';
export declare class WebpackResolver {
    protected readonly resolveFn: ($context: string, $path: string, $cb: ($err: Error, $result: string) => void) => void;
    constructor(resolveFn: ($context: string, $path: string, $cb: ($err: Error, $result: string) => void) => void);
    resolve($context: string, $path: string): Promise<string>;
}
export declare type WebpackLoaderResult = {
    source: string;
    sourceMap: RawSourceMap;
    module: webpack.Module;
};
export declare class WebpackLoader {
    protected readonly loadFn: ($r: string, $cb: ($err: Error, $source: string, $sourceMap: RawSourceMap, $module: webpack.Module) => void) => void;
    constructor(loadFn: ($r: string, $cb: ($err: Error, $source: string, $sourceMap: RawSourceMap, $module: webpack.Module) => void) => void);
    load($path: string): Promise<WebpackLoaderResult>;
}
export declare class CodeExecutor {
    protected readonly publicPath: string;
    static readonly executionCache: {
        [code: string]: any;
    };
    constructor(publicPath: string);
    evaluateCode<T>($context: string, $source: string, $fileName: string): T;
}
/**
 * Type guard to check if received loader options are HtmlResourceLoaderOptions.
 * @param $value
 * @returns boolean
 */
export declare function isHtmlResourceLoaderOptions($value: any): $value is HtmlResourceLoaderOptions;
/**
 * Type guard to assure that $value is Array<Node>.
 * @param $value
 * @returns boolean
 */
export declare function isArrayOfNodes($value: any): $value is Array<Node>;
//# sourceMappingURL=utils.d.ts.map