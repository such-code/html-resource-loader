"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const html_parser_utils_1 = require("@such-code/html-parser-utils");
const rules_configuration_1 = require("./rules-configuration");
// --- Selector ----------------------------------------------------------------------------------------------------- //
/**
 * Abstract class for selector rules. Is used as a selection behaviour for MutationRule.
 */
class MutationRuleSelector {
    constructor(negotiate) {
        this.negotiate = negotiate;
    }
}
exports.MutationRuleSelector = MutationRuleSelector;
/**
 * Rule to test element tag name.
 */
class MutationRuleTagSelector extends MutationRuleSelector {
    constructor($rule) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.tag = typeof $rule.tag === 'string'
            ? html_parser_utils_1.stringToRegExp($rule.tag)
            : $rule.tag;
    }
    test($element) {
        const result = $element.type === 'tag' && this.tag.test($element.name);
        return this.negotiate ? !result : result;
    }
}
exports.MutationRuleTagSelector = MutationRuleTagSelector;
/**
 * Rule to filter element by attribute/attribute value.
 */
class MutationRuleAttrSelector extends MutationRuleSelector {
    constructor($rule) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.attr = typeof $rule.attr === 'string'
            ? html_parser_utils_1.stringToRegExp($rule.attr)
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
// --- Source ------------------------------------------------------------------------------------------------------- //
/**
 * Abstract class for all rules to extract resource source path. Is used as a source extraction behaviour for
 * MutationRule.
 */
class MutationRuleSource {
    constructor(discard, $resolve) {
        this.discard = discard;
        this.hasResolver = typeof $resolve === 'function';
        this.resolve = typeof $resolve === 'function' ? $resolve : MutationRuleSource.defaultResolver;
    }
    static defaultResolver($context, $path) {
        return Promise.reject(Error('There are no resolver specified.'));
    }
}
exports.MutationRuleSource = MutationRuleSource;
/**
 * Rule used to extract resource path from Element attributes.
 */
class MutationRuleAttrSource extends MutationRuleSource {
    constructor($source) {
        super(typeof $source.remove === 'boolean' ? $source.remove : false, $source.resolve);
        this.attr = typeof $source.attr === 'string'
            ? html_parser_utils_1.stringToRegExp($source.attr)
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
// --- Target ------------------------------------------------------------------------------------------------------- //
/**
 * Abstract rule used as an aggregator for selection, source and target rules. These rules are used for processing.
 */
class MutationRule {
    constructor(selectors, source) {
        this.selectors = selectors;
        this.source = source;
    }
    /**
     * Checks is all selector rules match Element.
     * @param $element
     * @returns boolean
     */
    test($element) {
        return this.selectors.every($ => $.test($element));
    }
    /**
     * Returns resource source path for this Element.
     * @param $element
     */
    extract($element) {
        return this.source.extract($element);
    }
    /**
     * @param $context
     * @param $path
     */
    resolve($context, $path) {
        return this.source.resolve($context, $path);
    }
    get hasResolver() { return this.source.hasResolver; }
}
exports.MutationRule = MutationRule;
/**
 * Mutates whole Element.
 */
class MutationTagRule extends MutationRule {
    constructor($selectors, $source, $target) {
        super($selectors, $source);
        this.behaviour = $target.tag;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationTagRule.commonSerializer;
        this.trimContent = typeof $target.trimContent === 'boolean'
            ? $target.trimContent
            : true;
    }
    static commonSerializer($, $prev) {
        return $;
    }
    static simplifyDom($dom) {
        switch ($dom.length) {
            case 1:
                return $dom[0];
            case 0:
                return null;
        }
        return $dom;
    }
    apply($element, $data) {
        return html_parser_utils_1.stringToDom(this.trimContent ? $data.trim() : $data)
            .then(MutationTagRule.simplifyDom)
            .then($ => {
            return this.serialize($, $element);
        });
    }
}
exports.MutationTagRule = MutationTagRule;
/**
 * Rule to mutate Elements attribute.
 */
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
/**
 * Rule to mutate Elements child nodes.
 */
class MutationContentRule extends MutationRule {
    constructor($selectors, $source, $target) {
        super($selectors, $source);
        this.behaviour = $target.content;
    }
    apply($element, $data) {
        return html_parser_utils_1.stringToDom($data)
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
// --- Utils -------------------------------------------------------------------------------------------------------- //
/**
 * Converts rule definitions from configuration ot MutationRules.
 * @param $rules received from configuration. They must be already type checked.
 * @returns Array<MutationRule>
 */
function convertToMutationRules($rules) {
    return $rules.map(($rule) => {
        const selectors = $rule.selector
            .map(selector => {
            if (rules_configuration_1.isTagRuleSelector(selector)) {
                return new MutationRuleTagSelector(selector);
            }
            return new MutationRuleAttrSelector(selector);
        });
        const source = new MutationRuleAttrSource($rule.source);
        if (rules_configuration_1.isTagRuleTarget($rule.target)) {
            return new MutationTagRule(selectors, source, $rule.target);
        }
        else if (rules_configuration_1.isAttrRuleTarget($rule.target)) {
            return new MutationAttrRule(selectors, source, $rule.target);
        }
        return new MutationContentRule(selectors, source, $rule.target);
    });
}
exports.convertToMutationRules = convertToMutationRules;
