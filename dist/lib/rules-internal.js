"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToMutationRules = exports.MutationRule = exports.MutationContentRule = exports.MutationAttrRule = exports.MutationTagRule = exports.MutationRuleTarget = exports.MutationRuleAttrSource = exports.MutationRuleSource = exports.MutationRuleAttrSelector = exports.MutationRuleTagSelector = exports.MutationRuleTypeSelector = exports.MutationRuleSelector = void 0;
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
 * Rule to test element type.
 */
class MutationRuleTypeSelector extends MutationRuleSelector {
    constructor($rule) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.type = $rule.type;
    }
    test($element) {
        const result = $element.type === this.type;
        return this.negotiate ? !result : result;
    }
}
exports.MutationRuleTypeSelector = MutationRuleTypeSelector;
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
        const result = typeof $element.attribs === 'object'
            && $element.attribs !== null
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
    constructor($resolve) {
        this.hasResolver = typeof $resolve === 'function';
        this.resolve = typeof $resolve === 'function' ? $resolve : MutationRuleSource.defaultResolver;
    }
    static defaultResolver($context, $path) {
        return Promise.reject(Error('There are no resolver specified.'));
    }
    /**
     * Prepares element for further processing. By default specific processing is not required.
     * @param $element Element
     */
    prepare($element) {
        return $element;
    }
}
exports.MutationRuleSource = MutationRuleSource;
/**
 * Rule used to extract resource path from Element attributes.
 */
class MutationRuleAttrSource extends MutationRuleSource {
    constructor($source) {
        super($source.resolve);
        this.attr = typeof $source.attr === 'string'
            ? html_parser_utils_1.stringToRegExp($source.attr)
            : $source.attr;
        this.deserialize = typeof $source.deserialize === 'function'
            ? $source.deserialize
            : MutationRuleAttrSource.commonDeserializer;
        this.discardAttr = typeof $source.remove === 'boolean' ? $source.remove : false;
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
    prepare($element) {
        if (this.discardAttr) {
            const attr = this.extractAttribute($element);
            $element.attribs = Object
                .keys($element.attribs)
                .reduce(($acc, $current) => {
                if ($current !== attr) {
                    $acc[$current] = $element.attribs[$current];
                }
                return $acc;
            }, {});
        }
        return $element;
    }
}
exports.MutationRuleAttrSource = MutationRuleAttrSource;
// --- Target ------------------------------------------------------------------------------------------------------- //
/**
 * Abstract rule used as an aggregator for selection, source and target rules. These rules are used for processing.
 */
class MutationRuleTarget {
    /**
     *
     */
    get shouldBeUsed() { return false; }
}
exports.MutationRuleTarget = MutationRuleTarget;
/**
 * Mutates whole Element.
 */
class MutationTagRule extends MutationRuleTarget {
    constructor($target) {
        super();
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
class MutationAttrRule extends MutationRuleTarget {
    constructor($target) {
        super();
        this.attr = $target.attr;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationAttrRule.commonSerializer;
    }
    static commonSerializer($value) {
        return $value;
    }
    apply($element, $data) {
        $element.attribs = Object.assign(Object.assign({}, $element.attribs), { [this.attr]: this.serialize($data, $element.attribs[this.attr]) });
        return Promise.resolve($element);
    }
}
exports.MutationAttrRule = MutationAttrRule;
/**
 * Rule to mutate Elements child nodes.
 */
class MutationContentRule extends MutationRuleTarget {
    constructor($target) {
        super();
        this.behaviour = $target.content;
    }
    apply($element, $data) {
        return html_parser_utils_1.stringToDom($data)
            .then($dom => {
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
// --- Rule main class ---------------------------------------------------------------------------------------------- //
class MutationRule {
    constructor(selectors, source, $target) {
        this.selectors = selectors;
        this.source = source;
        this.target = Array.isArray($target) ? $target : [$target];
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
    /**
     * Applies mutation to an Element.
     * @param $element
     * @param $data
     * @returns Promise<Node | Array<Node>> single or multiple nodes could be returned in a result.
     */
    apply($element, $data) {
        return this.target
            .find(($value, $index, $targets) => {
            return $value.shouldBeUsed || $targets.length - $index === 1;
        })
            .apply(this.source.prepare($element), $data);
    }
    get hasResolver() { return this.source.hasResolver; }
}
exports.MutationRule = MutationRule;
// --- Utils -------------------------------------------------------------------------------------------------------- //
function convertToSelectorRule($rule) {
    if (rules_configuration_1.isTypeRuleSelector($rule)) {
        return new MutationRuleTypeSelector($rule);
    }
    if (rules_configuration_1.isTagRuleSelector($rule)) {
        return new MutationRuleTagSelector($rule);
    }
    return new MutationRuleAttrSelector($rule);
}
function convertToSourceRule($rule) {
    return new MutationRuleAttrSource($rule);
}
function convertToTargetRule($rule) {
    if (rules_configuration_1.isTagRuleTarget($rule)) {
        return new MutationTagRule($rule);
    }
    else if (rules_configuration_1.isAttrRuleTarget($rule)) {
        return new MutationAttrRule($rule);
    }
    return new MutationContentRule($rule);
}
/**
 * Converts rule definitions from configuration ot MutationRules.
 * @param $rules received from configuration. They must be already type checked.
 * @returns Array<MutationRuleBase>
 */
function convertToMutationRules($rules) {
    return $rules.map(($rule) => {
        const selectors = $rule.selector.map(convertToSelectorRule);
        const source = convertToSourceRule($rule.source);
        const target = Array.isArray($rule.target)
            ? $rule.target.map(convertToTargetRule)
            : convertToTargetRule($rule.target);
        return new MutationRule(selectors, source, target);
    });
}
exports.convertToMutationRules = convertToMutationRules;
//# sourceMappingURL=rules-internal.js.map