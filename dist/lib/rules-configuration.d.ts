import { Element, Node } from 'domhandler/lib';
/**
 * Common for selector configuration rules.
 */
declare type RuleSelectorBase = {
    /** Optional param to invert result of selection. */
    exclude?: boolean;
};
/**
 * Represents configuration object for selecting tag.
 */
export declare type TagRuleSelector = {
    /** Tag name or RegExp to match multiple similar tags. */
    tag: string | RegExp;
} & RuleSelectorBase;
/**
 * Type guard to make sure $value is TagRuleSelector.
 * @param $value
 * @returns boolean
 */
export declare function isTagRuleSelector($value: any): $value is TagRuleSelector;
/**
 * Configuration object to represent attribute selector.
 */
export declare type AttrRuleSelector = {
    /** Attribute name or RegExp to math multiple attribute names. */
    attr: string | RegExp;
    /** Filter result by attribute content. */
    filter?: ($: string) => boolean;
} & RuleSelectorBase;
/**
 * Type guard to check $value is AttrRuleSelector.
 * @param $value
 * @returns boolean
 */
export declare function isAttrRuleSelector($value: any): $value is AttrRuleSelector;
/**
 * Union to represent any selector type.
 */
export declare type RuleSelector = TagRuleSelector | AttrRuleSelector;
/**
 * Type guard to check if provided $value is RuleSelector.
 * @param $value
 * @returns boolean
 */
export declare function isRuleSelector($value: any): $value is RuleSelector;
/**
 * Common for all source rule configurations.
 */
declare type RuleSourceBase = {
    /** Optional function if specific source extraction is required. */
    deserialize?: ($: string) => string;
    /**
     * By default resolution is made by webpack and it is correct approach, but if it is really required to do
     * something special custom resolver could be used.
     */
    resolve?: ($context: string, $path: string) => string | Promise<string>;
};
/**
 * Represent object to extract resource path.
 */
export declare type AttrRuleSource = {
    /** Attribute name or RegExp (only first match will be used, so make sure you know what are you doing). */
    attr: string | RegExp;
    /** Optional flag to remove specified attribute in processed Node. Default `false`. */
    remove?: boolean;
} & RuleSourceBase;
/**
 * Type guard to check if $value is AttrRuleSource.
 * @param $value
 * @returns boolean
 */
export declare function isAttrRuleSource($value: any): $value is AttrRuleSource;
/**
 * This is union type to represent resource path source. Currently it consists from one type and exists just to align
 * with selector code.
 */
export declare type RuleSource = AttrRuleSource;
/**
 * Type guard to check if $value is RuleSource.
 * @param $value
 * @returns boolean
 */
export declare function isRuleSource($value: any): $value is RuleSource;
/**
 * Represent target as an attribute to contain processed resource result.
 */
export declare type AttrRuleTarget = {
    /** Attribute name where result will be placed. */
    attr: string;
    /** Optional serialization function if specific handling is required. */
    serialize?: ($: string, $prev?: string) => string;
};
/**
 * Type guard to check if $value is AttrRuleTarget.
 * @param $value
 * @returns boolean
 */
export declare function isAttrRuleTarget($value: any): $value is AttrRuleTarget;
/**
 * Represents source element tag as a target for processed content. Only option is ot replace original tag.
 */
export declare type TagRuleTarget = {
    /** Only option for the moment. Tag can only be replaced. */
    tag: 'replace';
    /** Optional serialization function for specific treatment. */
    serialize?: ($: Node | Array<Node>, $prev: Element) => Node | Array<Node>;
    /** Removes newlines and spaces from an end and beginning of received data. Default value is `true`. */
    trimContent?: boolean;
};
/**
 * Type guard to check if $value is TagRuleTarget.
 * @param $value
 * @returns boolean
 */
export declare function isTagRuleTarget($value: any): $value is TagRuleTarget;
/**
 * Target for initial element child content manipulation.
 */
export declare type ContentRuleTarget = {
    /**
     * Specifies content handling strategy. To replace possible Element content use 'replace'. To insert result in the
     * beginning of Element child nodes use 'prepend'. 'append' will insert result in the end of child nodes.
     */
    content: 'replace' | 'append' | 'prepend';
};
/**
 * Checks if $value is ContentRuleTarget.
 * @param $value
 * @returns boolean
 */
export declare function isContentRuleTarget($value: any): $value is ContentRuleTarget;
/**
 * Union type to represent processed result target.
 */
export declare type RuleTarget = TagRuleTarget | AttrRuleTarget | ContentRuleTarget;
/**
 * Type guard to check if $value is RuleTarget.
 * @param $value
 */
export declare function isRuleTarget($value: any): $value is RuleTarget;
/**
 * Object layout to represent loader rule.
 */
export declare type Rule = {
    /** All selectors must match to add element for processing. */
    selector: Array<RuleSelector>;
    /** Determines what should be taken as a resource paths source. */
    source: RuleSource;
    /** How Element will mutate after successful rule application. */
    target: RuleTarget;
};
/**
 * Type guard to check if $value is Rule.
 * @param $value
 * @returns boolean
 */
export declare function isRule($value: any): $value is Rule;
export {};
//# sourceMappingURL=rules-configuration.d.ts.map