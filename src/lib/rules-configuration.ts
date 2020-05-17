import { Element, Node } from 'domhandler/lib';

// --- Selectors ---------------------------------------------------------------------------------------------------- //

/**
 * Common for selector configuration rules.
 */
type RuleSelectorBase = {
    /** Optional param to invert result of selection. */
    exclude?: boolean,
}

/**
 * Represents configuration object for selecting tag.
 */
export type TagRuleSelector = {
    /** Tag name or RegExp to match multiple similar tags. */
    tag: string | RegExp,
} & RuleSelectorBase

/**
 * Type guard to make sure $value is TagRuleSelector.
 * @param $value
 * @returns boolean
 */
export function isTagRuleSelector($value: any): $value is TagRuleSelector {
    return typeof $value === 'object'
        && 'tag' in $value
        && (
            typeof $value.tag === 'string'
            || $value.tag instanceof RegExp
        );
}

/**
 * Configuration object to represent attribute selector.
 */
export type AttrRuleSelector = {
    /** Attribute name or RegExp to math multiple attribute names. */
    attr: string | RegExp,
    /** Filter result by attribute content. */
    filter?: ($: string) => boolean,
} & RuleSelectorBase

/**
 * Type guard to check $value is AttrRuleSelector.
 * @param $value
 * @returns boolean
 */
export function isAttrRuleSelector($value: any): $value is AttrRuleSelector {
    return typeof $value === 'object'
        && 'attr' in $value
        && (
            typeof $value.attr === 'string'
            || $value.attr instanceof RegExp
        );
}

/**
 * Union to represent any selector type.
 */
export type RuleSelector = TagRuleSelector | AttrRuleSelector

/**
 * Type guard to check if provided $value is RuleSelector.
 * @param $value
 * @returns boolean
 */
export function isRuleSelector($value: any): $value is RuleSelector {
    return isTagRuleSelector($value)
        || isAttrRuleSelector($value);
}

// --- Resource source ---------------------------------------------------------------------------------------------- //

/**
 * Common for all source rule configurations.
 */
type RuleSourceBase = {
    /** Optional function if specific source extraction is required. */
    deserialize?: ($: string) => string,
    /**
     * By default resolution is made by webpack and it is correct approach, but if it is really required to do
     * something special custom resolver could be used.
     */
    resolve?: ($context: string, $path: string) => string | Promise<string>,
}

/**
 * Represent object to extract resource path.
 */
export type AttrRuleSource = {
    /** Attribute name or RegExp (only first match will be used, so make sure you know what are you doing). */
    attr: string | RegExp,
    /** Optional flag to remove specified attribute in processed Node. Default `false`. */
    remove?: boolean,
} & RuleSourceBase;

/**
 * Type guard to check if $value is AttrRuleSource.
 * @param $value
 * @returns boolean
 */
export function isAttrRuleSource($value: any): $value is AttrRuleSource {
    return typeof $value === 'object'
        && 'attr' in $value
        && (
            typeof $value.attr === 'string'
            || $value.attr instanceof RegExp
        );
}

/**
 * This is union type to represent resource path source. Currently it consists from one type and exists just to align
 * with selector code.
 */
export type RuleSource = AttrRuleSource;

/**
 * Type guard to check if $value is RuleSource.
 * @param $value
 * @returns boolean
 */
export function isRuleSource($value: any): $value is RuleSource {
    return isAttrRuleSource($value);
}

// --- Target ------------------------------------------------------------------------------------------------------- //

/**
 * Represent target as an attribute to contain processed resource result.
 */
export type AttrRuleTarget = {
    /** Attribute name where result will be placed. */
    attr: string,
    /** Optional serialization function if specific handling is required. */
    serialize?: ($: string, $prev?: string) => string,
}

/**
 * Type guard to check if $value is AttrRuleTarget.
 * @param $value
 * @returns boolean
 */
export function isAttrRuleTarget($value: any): $value is AttrRuleTarget {
    return typeof $value === 'object'
        && typeof $value.attr === 'string';
}

/**
 * Represents source element tag as a target for processed content. Only option is ot replace original tag.
 */
export type TagRuleTarget = {
    /** Only option for the moment. Tag can only be replaced. */
    tag: 'replace',
    /** Optional serialization function for specific treatment. */
    serialize?: ($: Node | Array<Node>, $prev: Element) => Node | Array<Node>,
    /** Removes newlines and spaces from an end and beginning of received data. Default value is `true`. */
    trimContent?: boolean,
}

/**
 * Type guard to check if $value is TagRuleTarget.
 * @param $value
 * @returns boolean
 */
export function isTagRuleTarget($value: any): $value is TagRuleTarget {
    return typeof $value === 'object'
        && $value.tag === 'replace';
}

/**
 * Target for initial element child content manipulation.
 */
export type ContentRuleTarget = {
    /**
     * Specifies content handling strategy. To replace possible Element content use 'replace'. To insert result in the
     * beginning of Element child nodes use 'prepend'. 'append' will insert result in the end of child nodes.
     */
    content: 'replace' | 'append' | 'prepend',
}

/**
 * Checks if $value is ContentRuleTarget.
 * @param $value
 * @returns boolean
 */
export function isContentRuleTarget($value: any): $value is ContentRuleTarget {
    return typeof $value === 'object'
        && (
            $value.content === 'replace'
            || $value.content === 'append'
            || $value.content === 'prepend'
        );
}

/**
 * Union type to represent processed result target.
 */
export type RuleTarget = TagRuleTarget | AttrRuleTarget | ContentRuleTarget

/**
 * Type guard to check if $value is RuleTarget.
 * @param $value
 */
export function isRuleTarget($value: any): $value is RuleTarget {
    return isAttrRuleTarget($value)
        || isTagRuleTarget($value)
        || isContentRuleTarget($value);
}

// --- Configuration ------------------------------------------------------------------------------------------------ //

/**
 * Object layout to represent loader rule.
 */
export type Rule = {
    /** All selectors must match to add element for processing. */
    selector: Array<RuleSelector>,
    /** Determines what should be taken as a resource paths source. */
    source: RuleSource,
    /** How Element will mutate after successful rule application. */
    target: RuleTarget,
}

/**
 * Type guard to check if $value is Rule.
 * @param $value
 * @returns boolean
 */
export function isRule($value: any): $value is Rule {
    return typeof $value === 'object'
        && Array.isArray($value.selector) && $value.selector.every(isRuleSelector)
        && isRuleSource($value.source)
        && isRuleTarget($value.target);
}
