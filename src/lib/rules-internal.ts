import { stringToDom, stringToRegExp } from '@such-code/html-parser-utils';
import { Element, Node } from "domhandler/lib";
import {
    AttrRuleSelector,
    AttrRuleSource,
    AttrRuleTarget,
    ContentRuleTarget,
    isAttrRuleTarget,
    isTagRuleSelector,
    isTagRuleTarget,
    isTypeRuleSelector,
    Rule,
    RuleSelector,
    RuleSource,
    RuleTarget,
    TagRuleSelector,
    TagRuleTarget, TypeRuleSelector
} from './rules-configuration';


// --- Selector ----------------------------------------------------------------------------------------------------- //

/**
 * Abstract class for selector rules. Is used as a selection behaviour for MutationRule.
 */
export abstract class MutationRuleSelector {
    protected constructor(
        protected readonly negotiate: boolean
    ) {}

    /**
     * Shows if element passes rule checks.
     * @param $element
     * @returns boolean
     */
    public abstract test($element: Element): boolean;
}

/**
 * Rule to test element type.
 */
export class MutationRuleTypeSelector extends MutationRuleSelector {
    protected readonly type: string;

    public constructor($rule: TypeRuleSelector) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.type = $rule.type;
    }

    public test($element: Element): boolean {
        const result = $element.type === this.type;
        return this.negotiate ? !result : result;
    }
}

/**
 * Rule to test element tag name.
 */
export class MutationRuleTagSelector extends MutationRuleSelector {
    protected readonly tag: RegExp;

    public constructor($rule: TagRuleSelector) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.tag = typeof $rule.tag === 'string'
            ? stringToRegExp($rule.tag)
            : $rule.tag;
    }

    public test($element: Element): boolean {
        const result = $element.type === 'tag' && this.tag.test($element.name);
        return this.negotiate ? !result : result;
    }
}

/**
 * Rule to filter element by attribute/attribute value.
 */
export class MutationRuleAttrSelector extends MutationRuleSelector {
    protected static commonFilter($: string): boolean {
        return true;
    }

    protected readonly attr: RegExp;
    protected readonly filter: ($: string) => boolean;

    public constructor($rule: AttrRuleSelector) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.attr = typeof $rule.attr === 'string'
            ? stringToRegExp($rule.attr)
            : $rule.attr;

        this.filter = typeof $rule.filter === 'function'
            ? $rule.filter
            : MutationRuleAttrSelector.commonFilter;
    }

    public test($element: Element): boolean {
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

// --- Source ------------------------------------------------------------------------------------------------------- //

/**
 * Abstract class for all rules to extract resource source path. Is used as a source extraction behaviour for
 * MutationRule.
 */
export abstract class MutationRuleSource {
    protected static defaultResolver($context: string, $path: string): Promise<string> {
        return Promise.reject(Error('There are no resolver specified.'))
    }

    public readonly hasResolver: boolean;
    public readonly resolve: ($context: string, $path: string) => string | Promise<string>;

    protected constructor(
        $resolve?: (($context: string, $path: string) => string | Promise<string>)
    ) {
        this.hasResolver = typeof $resolve === 'function';
        this.resolve = typeof $resolve === 'function' ? $resolve : MutationRuleSource.defaultResolver;
    }

    /**
     * Returns resource path for this Element.
     * @param $element
     * @returns string
     */
    public abstract extract($element: Element): string;

    /**
     * Prepares element for further processing. By default specific processing is not required.
     * @param $element Element
     */
    public prepare($element: Element): Element {
        return $element;
    }
}

/**
 * Rule used to extract resource path from Element attributes.
 */
export class MutationRuleAttrSource extends MutationRuleSource {
    protected static commonDeserializer($value: string): string {
        return $value;
    }

    protected readonly attr: RegExp;
    protected readonly deserialize: ($: string) => string;
    protected readonly discardAttr: boolean;

    constructor($source: AttrRuleSource) {
        super($source.resolve);

        this.attr = typeof $source.attr === 'string'
            ? stringToRegExp($source.attr)
            : $source.attr;
        this.deserialize = typeof $source.deserialize === 'function'
            ? $source.deserialize
            : MutationRuleAttrSource.commonDeserializer;
        this.discardAttr = typeof $source.remove === 'boolean' ? $source.remove : false;
    }

    protected extractAttribute($element: Element): string {
        return Object.keys($element.attribs).find($ => this.attr.test($))
    }

    public extract($element: Element): string {
        return this.deserialize(
            $element.attribs[this.extractAttribute($element)]
        );
    }

    public prepare($element: Element): Element {
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

// --- Target ------------------------------------------------------------------------------------------------------- //

/**
 * Abstract rule used as an aggregator for selection, source and target rules. These rules are used for processing.
 */
export abstract class MutationRuleTarget {
    /**
     * Applies mutation to an Element.
     * @param $element
     * @param $data
     * @returns Promise<Node | Array<Node>> single or multiple nodes could be returned in a result.
     */
    public abstract apply($element: Element, $data: string): Promise<Node | Array<Node>>;

    /**
     *
     */
    public get shouldBeUsed(): boolean { return false; }
}

/**
 * Mutates whole Element.
 */
export class MutationTagRule extends MutationRuleTarget {
    protected static commonSerializer($: Node | Array<Node>, $prev: Element): Node | Array<Node> {
        return $;
    }

    protected static simplifyDom($dom: Array<Node>): Node | Array<Node> {
        switch ($dom.length) {
            case 1:
                return $dom[0];
            case 0:
                return null;
        }
        return $dom;
    }

    protected readonly behaviour: 'replace';
    protected readonly serialize: ($: Node | Array<Node>, $prev: Element) => Node | Array<Node>;
    protected readonly trimContent: boolean;

    public constructor($target: TagRuleTarget) {
        super();

        this.behaviour = $target.tag;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationTagRule.commonSerializer;
        this.trimContent = typeof $target.trimContent === 'boolean'
            ? $target.trimContent
            : true;
    }

    public apply($element: Element, $data: string): Promise<Node | Array<Node>> {
        return stringToDom(this.trimContent ? $data.trim() : $data)
            .then(MutationTagRule.simplifyDom)
            .then($ => {
                return this.serialize($, $element);
            });
    }
}

/**
 * Rule to mutate Elements attribute.
 */
export class MutationAttrRule extends MutationRuleTarget {
    protected static commonSerializer($value: string): string {
        return $value;
    }

    protected readonly attr: string;
    protected readonly serialize: ($value: string, $previous?: string) => string;

    public constructor($target: AttrRuleTarget) {
        super();

        this.attr = $target.attr;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationAttrRule.commonSerializer;
    }

    public apply($element: Element, $data: string): Promise<Element> {
        $element.attribs = {
            ...$element.attribs,
            [this.attr]: this.serialize($data, $element.attribs[this.attr]),
        };
        return Promise.resolve($element);
    }
}

/**
 * Rule to mutate Elements child nodes.
 */
export class MutationContentRule extends MutationRuleTarget {
    protected readonly behaviour: 'replace' | 'append' | 'prepend';

    public constructor(
        $target: ContentRuleTarget,
    ) {
        super();

        this.behaviour = $target.content;
    }

    public apply($element: Element, $data: string): Promise<Element> {
        return stringToDom($data)
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

// --- Rule main class ---------------------------------------------------------------------------------------------- //
export class MutationRule {
    protected readonly target: Array<MutationRuleTarget>;

    public constructor(
        protected readonly selectors: Array<MutationRuleSelector>,
        protected readonly source: MutationRuleSource,
        $target: MutationRuleTarget | Array<MutationRuleTarget>,
    ) {
        this.target = Array.isArray($target) ? $target : [$target];
    }

    /**
     * Checks is all selector rules match Element.
     * @param $element
     * @returns boolean
     */
    public test($element: Element): boolean {
        return this.selectors.every($ => $.test($element));
    }

    /**
     * Returns resource source path for this Element.
     * @param $element
     */
    public extract($element: Element): string {
        return this.source.extract($element);
    }

    /**
     * @param $context
     * @param $path
     */
    public resolve($context: string, $path: string): string | Promise<string> {
        return this.source.resolve($context, $path);
    }

    /**
     * Applies mutation to an Element.
     * @param $element
     * @param $data
     * @returns Promise<Node | Array<Node>> single or multiple nodes could be returned in a result.
     */
    public apply($element: Element, $data: string): Promise<Node | Array<Node>> {
        return this.target
            .find(($value, $index, $targets) => {
                return $value.shouldBeUsed || $targets.length - $index === 1;
            })
            .apply(this.source.prepare($element), $data);
    }

    public get hasResolver(): boolean { return this.source.hasResolver; }
}

// --- Utils -------------------------------------------------------------------------------------------------------- //

function convertToSelectorRule($rule: RuleSelector): MutationRuleSelector {
    if (isTypeRuleSelector($rule)) {
        return new MutationRuleTypeSelector($rule);
    }
    if (isTagRuleSelector($rule)) {
        return new MutationRuleTagSelector($rule);
    }
    return new MutationRuleAttrSelector($rule);
}

function convertToSourceRule($rule: RuleSource): MutationRuleSource {
    return new MutationRuleAttrSource($rule);
}

function convertToTargetRule($rule: RuleTarget): MutationRuleTarget {
    if(isTagRuleTarget($rule)) {
        return new MutationTagRule($rule);
    } else if (isAttrRuleTarget($rule)) {
        return new MutationAttrRule($rule);
    }
    return new MutationContentRule($rule);
}

/**
 * Converts rule definitions from configuration ot MutationRules.
 * @param $rules received from configuration. They must be already type checked.
 * @returns Array<MutationRuleBase>
 */
export function convertToMutationRules($rules: Array<Rule>): Array<MutationRule> {
    return $rules.map<MutationRule>(($rule: Rule): MutationRule => {
        const selectors: Array<MutationRuleSelector> = $rule.selector.map(convertToSelectorRule);
        const source = convertToSourceRule($rule.source);
        const target = Array.isArray($rule.target)
            ? $rule.target.map(convertToTargetRule)
            : convertToTargetRule($rule.target);

        return new MutationRule(selectors, source, target);
    });
}
