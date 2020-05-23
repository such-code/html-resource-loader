"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRule = exports.isRuleTarget = exports.isContentRuleTarget = exports.isTagRuleTarget = exports.isAttrRuleTarget = exports.isRuleSource = exports.isAttrRuleSource = exports.isRuleSelector = exports.isAttrRuleSelector = exports.isTagRuleSelector = void 0;
/**
 * Type guard to make sure $value is TagRuleSelector.
 * @param $value
 * @returns boolean
 */
function isTagRuleSelector($value) {
    return typeof $value === 'object'
        && 'tag' in $value
        && (typeof $value.tag === 'string'
            || $value.tag instanceof RegExp);
}
exports.isTagRuleSelector = isTagRuleSelector;
/**
 * Type guard to check $value is AttrRuleSelector.
 * @param $value
 * @returns boolean
 */
function isAttrRuleSelector($value) {
    return typeof $value === 'object'
        && 'attr' in $value
        && (typeof $value.attr === 'string'
            || $value.attr instanceof RegExp);
}
exports.isAttrRuleSelector = isAttrRuleSelector;
/**
 * Type guard to check if provided $value is RuleSelector.
 * @param $value
 * @returns boolean
 */
function isRuleSelector($value) {
    return isTagRuleSelector($value)
        || isAttrRuleSelector($value);
}
exports.isRuleSelector = isRuleSelector;
/**
 * Type guard to check if $value is AttrRuleSource.
 * @param $value
 * @returns boolean
 */
function isAttrRuleSource($value) {
    return typeof $value === 'object'
        && 'attr' in $value
        && (typeof $value.attr === 'string'
            || $value.attr instanceof RegExp);
}
exports.isAttrRuleSource = isAttrRuleSource;
/**
 * Type guard to check if $value is RuleSource.
 * @param $value
 * @returns boolean
 */
function isRuleSource($value) {
    return isAttrRuleSource($value);
}
exports.isRuleSource = isRuleSource;
/**
 * Type guard to check if $value is AttrRuleTarget.
 * @param $value
 * @returns boolean
 */
function isAttrRuleTarget($value) {
    return typeof $value === 'object'
        && typeof $value.attr === 'string';
}
exports.isAttrRuleTarget = isAttrRuleTarget;
/**
 * Type guard to check if $value is TagRuleTarget.
 * @param $value
 * @returns boolean
 */
function isTagRuleTarget($value) {
    return typeof $value === 'object'
        && $value.tag === 'replace';
}
exports.isTagRuleTarget = isTagRuleTarget;
/**
 * Checks if $value is ContentRuleTarget.
 * @param $value
 * @returns boolean
 */
function isContentRuleTarget($value) {
    return typeof $value === 'object'
        && ($value.content === 'replace'
            || $value.content === 'append'
            || $value.content === 'prepend');
}
exports.isContentRuleTarget = isContentRuleTarget;
/**
 * Type guard to check if $value is RuleTarget.
 * @param $value
 */
function isRuleTarget($value) {
    return isAttrRuleTarget($value)
        || isTagRuleTarget($value)
        || isContentRuleTarget($value);
}
exports.isRuleTarget = isRuleTarget;
/**
 * Type guard to check if $value is Rule.
 * @param $value
 * @returns boolean
 */
function isRule($value) {
    return typeof $value === 'object'
        && Array.isArray($value.selector) && $value.selector.every(isRuleSelector)
        && isRuleSource($value.source)
        && (isRuleTarget($value.target)
            || (Array.isArray($value.target) && $value.target.every(isRuleTarget)));
}
exports.isRule = isRule;
//# sourceMappingURL=rules-configuration.js.map