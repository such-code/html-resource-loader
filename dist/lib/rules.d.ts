export declare type Rules = {
    tag: string | RegExp | Array<string | RegExp>;
    attr: string | RegExp | Array<string | RegExp>;
};
export declare type NormalizedRule = {
    tag: Array<RegExp>;
    attr: Array<RegExp>;
};
export declare function normalizeRuleObjects($rules: Array<Rules>): Array<NormalizedRule>;
