import * as vm from "vm";
import * as webpack from 'webpack';
import { Node } from 'domhandler/lib/node';
import { isNode } from '@such-code/html-parser-utils';
import { HtmlResourceLoaderOptions } from './index';
import { isRule } from './rules-configuration';
import { RawSourceMap } from 'source-map';

export class WebpackResolver {
    public constructor(
        protected readonly resolveFn: ($context: string, $path: string, $cb: ($err: Error, $result: string) => void) => void,
    ) {
    }

    public resolve($context: string, $path: string): Promise<string> {
        return new Promise<string>(($resolve, $reject) => {
            this.resolveFn($context, $path, ($err, $result) => {
                if ($err) {
                    $reject($err);
                } else {
                    $resolve($result);
                }
            });
        });
    }
}

export type WebpackLoaderResult = {
    source: string
    sourceMap: RawSourceMap,
    module: webpack.Module,
}

export class WebpackLoader {
    public constructor(
        protected readonly loadFn: ($r: string, $cb: ($err: Error, $source: string, $sourceMap: RawSourceMap, $module: webpack.Module) => void) => void,
    ) {
    }

    public load($path: string): Promise<WebpackLoaderResult> {
        return new Promise<WebpackLoaderResult>(($resolve, $reject) => {
            this.loadFn($path, ($err, $source, $sourceMap, $module: webpack.Module) => {
                if ($err) {
                    $reject($err);
                } else {
                    $resolve(<WebpackLoaderResult>{
                        source: $source,
                        sourceMap: $sourceMap,
                        module: $module,
                    });
                }
            });
        });
    }
}

export class CodeExecutor {
    static readonly executionCache: { [code: string]: any } = {};

    public constructor(
        protected readonly publicPath: string,
    ) { }

    public evaluateCode<T>($context: string, $source: string, $fileName: string): T {
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

/**
 * Type guard to check if received loader options are HtmlResourceLoaderOptions.
 * @param $value
 * @returns boolean
 */
export function isHtmlResourceLoaderOptions($value: any): $value is HtmlResourceLoaderOptions {
    return typeof $value === 'object'
        && $value !== null
        && Array.isArray($value.rules)
        && $value.rules.every($ => isRule($));
}

/**
 * Type guard to assure that $value is Array<Node>.
 * @param $value
 * @returns boolean
 */
export function isArrayOfNodes($value: any): $value is Array<Node> {
    // Only top level items are checked, no recursion here.
    return Array.isArray($value) && $value.every(isNode);
}
