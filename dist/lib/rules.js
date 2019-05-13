"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function normalizeRuleTest($test) {
    if ($test instanceof RegExp) {
        return $test;
    }
    if (typeof $test === 'string') {
        return new RegExp(`^${$test.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
    }
    throw new Error('Test value must be a string, a RegExp or an Array of strings or RegExps.');
}
function normalizeRule($rule) {
    if (Array.isArray($rule)) {
        return $rule.map(normalizeRuleTest);
    }
    return [normalizeRuleTest($rule)];
}
function normalizeRuleObjects($rules) {
    return $rules.map($ => ({
        tag: normalizeRule($.tag),
        attr: normalizeRule($.attr),
    }));
}
exports.normalizeRuleObjects = normalizeRuleObjects;
//# sourceMappingURL=rules.js.map