import { DomHandlerOptions } from 'domhandler/lib';
import { ParserOptions } from 'htmlparser2';
import { Rule } from './rules-configuration';
export declare type HtmlResourceLoaderOptions = {
    rules: Array<Rule>;
    publicPath?: string | (($context: string) => string);
    htmlParserOptions?: ParserOptions;
    domHandlerOptions?: DomHandlerOptions;
};
//# sourceMappingURL=index.d.ts.map