export type Rules = {
    tag: string | RegExp | Array<string | RegExp>,
    attr: string | RegExp | Array<string | RegExp>,
}

export type NormalizedRule = {
    tag: Array<RegExp>,
    attr: Array<RegExp>,
}

function normalizeRuleTest($test: RegExp | string): RegExp {
    if ($test instanceof RegExp) {
        return $test;
    }
    if (typeof $test === 'string') {
        return new RegExp(`^${$test.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
    }

    throw new Error('Test value must be a string, a RegExp or an Array of strings or RegExps.');
}

function normalizeRule($rule: RegExp | string | Array<RegExp | string>): Array<RegExp> {
    if (Array.isArray($rule)) {
        return $rule.map(normalizeRuleTest);
    }
    return [ normalizeRuleTest($rule) ];
}

export function normalizeRuleObjects($rules: Array<Rules>): Array<NormalizedRule> {
    return $rules.map($ => ({
        tag: normalizeRule($.tag),
        attr: normalizeRule($.attr),
    }));
}
