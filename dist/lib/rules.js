"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function isTagRuleSelector($value) {
    return typeof $value === 'object'
        && 'tag' in $value
        && (typeof $value.tag === 'string'
            || $value.tag instanceof RegExp);
}
exports.isTagRuleSelector = isTagRuleSelector;
function isAttrRuleSelector($value) {
    return typeof $value === 'object'
        && 'attr' in $value
        && (typeof $value.attr === 'string'
            || $value.attr instanceof RegExp);
}
exports.isAttrRuleSelector = isAttrRuleSelector;
function isRuleSelector($value) {
    return isTagRuleSelector($value)
        || isAttrRuleSelector($value);
}
exports.isRuleSelector = isRuleSelector;
function isAttrRuleSource($value) {
    return typeof $value === 'object'
        && 'attr' in $value
        && (typeof $value.attr === 'string'
            || $value.attr instanceof RegExp);
}
exports.isAttrRuleSource = isAttrRuleSource;
function isRuleSource($value) {
    return isAttrRuleSource($value);
}
exports.isRuleSource = isRuleSource;
function isAttrRuleTarget($value) {
    return typeof $value === 'object'
        && typeof $value.attr === 'string';
}
exports.isAttrRuleTarget = isAttrRuleTarget;
function isTagRuleTarget($value) {
    return typeof $value === 'object'
        && $value.tag === 'replace';
}
exports.isTagRuleTarget = isTagRuleTarget;
function isContentRuleTarget($value) {
    return typeof $value === 'object'
        && ($value.content === 'replace'
            || $value.content === 'append'
            || $value.content === 'prepend');
}
exports.isContentRuleTarget = isContentRuleTarget;
function isRuleTarget($value) {
    return isAttrRuleTarget($value)
        || isTagRuleTarget($value)
        || isContentRuleTarget($value);
}
exports.isRuleTarget = isRuleTarget;
function isRule($value) {
    return typeof $value === 'object'
        && Array.isArray($value.selector) && $value.selector.every(isRuleSelector)
        && isRuleSource($value.source)
        && isRuleTarget($value.target);
}
exports.isRule = isRule;
// ------------------------------------------------------------------------------------------------------------------ //
class MutationRuleSelector {
    constructor(negotiate) {
        this.negotiate = negotiate;
    }
}
exports.MutationRuleSelector = MutationRuleSelector;
class MutationRuleTagSelector extends MutationRuleSelector {
    constructor($rule) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.tag = typeof $rule.tag === 'string'
            ? utils_1.stringToRegExp($rule.tag)
            : $rule.tag;
    }
    test($element) {
        const result = $element.type === 'tag' && this.tag.test($element.name);
        return this.negotiate ? !result : result;
    }
}
exports.MutationRuleTagSelector = MutationRuleTagSelector;
class MutationRuleAttrSelector extends MutationRuleSelector {
    constructor($rule) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.attr = typeof $rule.attr === 'string'
            ? utils_1.stringToRegExp($rule.attr)
            : $rule.attr;
        this.filter = typeof $rule.filter === 'function'
            ? $rule.filter
            : MutationRuleAttrSelector.commonFilter;
    }
    static commonFilter($) {
        return true;
    }
    test($element) {
        const result = $element.type === 'tag'
            && typeof $element.attribs === 'object'
            && Object
                .keys($element.attribs)
                .findIndex($ => {
                return this.attr.test($) && this.filter($element.attribs[$]);
            }) > -1;
        return this.negotiate ? !result : result;
    }
}
exports.MutationRuleAttrSelector = MutationRuleAttrSelector;
// ------------------------------------------------------------------------------------------------------------------ //
class MutationRuleSource {
    constructor(discard) {
        this.discard = discard;
    }
}
exports.MutationRuleSource = MutationRuleSource;
class MutationRuleAttrSource extends MutationRuleSource {
    constructor($source) {
        super(typeof $source.remove === 'boolean' ? $source.remove : false);
        this.attr = typeof $source.attr === 'string'
            ? utils_1.stringToRegExp($source.attr)
            : $source.attr;
        this.deserialize = typeof $source.deserialize === 'function'
            ? $source.deserialize
            : MutationRuleAttrSource.commonDeserializer;
    }
    static commonDeserializer($value) {
        return $value;
    }
    extractAttribute($element) {
        return Object.keys($element.attribs).find($ => this.attr.test($));
    }
    extract($element) {
        return this.deserialize($element.attribs[this.extractAttribute($element)]);
    }
    clean($element) {
        const attr = this.extractAttribute($element);
        $element.attribs = Object
            .keys($element.attribs)
            .reduce(($acc, $current) => {
            if ($current !== attr) {
                $acc[$current] = $element.attribs[$current];
            }
            return $acc;
        }, {});
        return $element;
    }
}
exports.MutationRuleAttrSource = MutationRuleAttrSource;
// ------------------------------------------------------------------------------------------------------------------ //
class MutationRule {
    constructor(selectors, source) {
        this.selectors = selectors;
        this.source = source;
    }
    test($element) {
        return this.selectors.every($ => $.test($element));
    }
    extract($element) {
        return this.source.extract($element);
    }
}
exports.MutationRule = MutationRule;
class MutationTagRule extends MutationRule {
    constructor($selectors, $source, $target) {
        super($selectors, $source);
        this.behaviour = $target.tag;
    }
    apply($element, $data) {
        return utils_1.stringToDom($data)
            .then($ => {
            switch ($.length) {
                case 0:
                    return undefined;
                case 1:
                    return $[0];
            }
            return $;
        });
    }
}
exports.MutationTagRule = MutationTagRule;
class MutationAttrRule extends MutationRule {
    constructor($selectors, $source, $target) {
        super($selectors, $source);
        this.attr = $target.attr;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationAttrRule.commonSerializer;
    }
    static commonSerializer($value) {
        return $value;
    }
    apply($element, $data) {
        if (this.source.discard) {
            $element = this.source.clean($element);
        }
        $element.attribs = Object.assign(Object.assign({}, $element.attribs), { [this.attr]: this.serialize($data, $element.attribs[this.attr]) });
        return Promise.resolve($element);
    }
}
exports.MutationAttrRule = MutationAttrRule;
class MutationContentRule extends MutationRule {
    constructor($selectors, $source, $target) {
        super($selectors, $source);
        this.behaviour = $target.content;
    }
    apply($element, $data) {
        return utils_1.stringToDom($data)
            .then($dom => {
            if (this.source.discard) {
                $element = this.source.clean($element);
            }
            switch (this.behaviour) {
                case 'append':
                    $element.children = $element.children.concat($dom);
                    break;
                case 'prepend':
                    $element.children = $dom.concat($element.children);
                    break;
                default:
                    $element.children = $dom;
            }
            return $element;
        });
    }
}
exports.MutationContentRule = MutationContentRule;
// ------------------------------------------------------------------------------------------------------------------ //
function rulesFactory($rules) {
    const result = [];
    for (let rule of $rules) {
        if (isRule(rule)) {
            const selectors = [];
            for (let selector of rule.selector) {
                if (isTagRuleSelector(selector)) {
                    selectors.push(new MutationRuleTagSelector(selector));
                }
                else if (isAttrRuleSelector(selector)) {
                    selectors.push(new MutationRuleAttrSelector(selector));
                }
            }
            let source;
            if (isAttrRuleSource(rule.source)) {
                source = new MutationRuleAttrSource(rule.source);
            }
            if (isTagRuleTarget(rule.target)) {
                result.push(new MutationTagRule(selectors, source, rule.target));
            }
            else if (isAttrRuleTarget(rule.target)) {
                result.push(new MutationAttrRule(selectors, source, rule.target));
            }
            else if (isContentRuleTarget(rule.target)) {
                result.push(new MutationContentRule(selectors, source, rule.target));
            }
        }
        else {
            // This is an Error, do something.
        }
    }
    return result;
}
exports.rulesFactory = rulesFactory;
//# sourceMappingURL=rules.js.map