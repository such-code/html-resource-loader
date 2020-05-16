import { Element, Node } from "domhandler/lib";
import { stringToDom, stringToRegExp } from '@such-code/html-parser-utils';
import { type } from 'os';
import {
    AttrRuleSelector,
    AttrRuleSource,
    AttrRuleTarget,
    ContentRuleTarget,
    isAttrRuleTarget,
    isTagRuleSelector,
    isTagRuleTarget,
    Rule,
    TagRuleSelector,
    TagRuleTarget
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
        public readonly discard: boolean,
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
     * Is required on final processing stage to cleanup unnecessary attributes used only as a resource path provider.
     * @param $element
     * @returns Element
     */
    public abstract clean($element: Element): Element;
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

    constructor($source: AttrRuleSource) {
        super(typeof $source.remove === 'boolean' ? $source.remove : false, $source.resolve);
        this.attr = typeof $source.attr === 'string'
            ? stringToRegExp($source.attr)
            : $source.attr;
        this.deserialize = typeof $source.deserialize === 'function'
            ? $source.deserialize
            : MutationRuleAttrSource.commonDeserializer;
    }

    protected extractAttribute($element: Element): string {
        return Object.keys($element.attribs).find($ => this.attr.test($))
    }

    public extract($element: Element): string {
        return this.deserialize(
            $element.attribs[this.extractAttribute($element)]
        );
    }

    public clean($element: Element): Element {
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

// --- Target ------------------------------------------------------------------------------------------------------- //

/**
 * Abstract rule used as an aggregator for selection, source and target rules. These rules are used for processing.
 */
export abstract class MutationRule {
    protected constructor(
        protected readonly selectors: Array<MutationRuleSelector>,
        protected readonly source: MutationRuleSource,
    ) { }

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
    public abstract apply($element: Element, $data: string): Promise<Node | Array<Node>>;

    public get hasResolver(): boolean { return this.source.hasResolver; }
}

/**
 * Mutates whole Element.
 */
export class MutationTagRule extends MutationRule {
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

    public constructor(
        $selectors: Array<MutationRuleSelector>,
        $source: MutationRuleSource,
        $target: TagRuleTarget,
    ) {
        super($selectors, $source);
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
export class MutationAttrRule extends MutationRule {
    protected static commonSerializer($value: string): string {
        return $value;
    }

    protected readonly attr: string;
    protected readonly serialize: ($value: string, $previous?: string) => string;

    public constructor(
        $selectors: Array<MutationRuleSelector>,
        $source: MutationRuleSource,
        $target: AttrRuleTarget,
    ) {
        super($selectors, $source);
        this.attr = $target.attr;
        this.serialize = typeof $target.serialize === 'function'
            ? $target.serialize
            : MutationAttrRule.commonSerializer;
    }

    public apply($element: Element, $data: string): Promise<Element> {
        if (this.source.discard) {
            $element = this.source.clean($element);
        }

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
export class MutationContentRule extends MutationRule {
    protected readonly behaviour: 'replace' | 'append' | 'prepend';

    public constructor(
        $selectors: Array<MutationRuleSelector>,
        $source: MutationRuleSource,
        $target: ContentRuleTarget,
    ) {
        super($selectors, $source);
        this.behaviour = $target.content;
    }

    public apply($element: Element, $data: string): Promise<Element> {
        return stringToDom($data)
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

// --- Utils -------------------------------------------------------------------------------------------------------- //

/**
 * Converts rule definitions from configuration ot MutationRules.
 * @param $rules received from configuration. They must be already type checked.
 * @returns Array<MutationRule>
 */
export function convertToMutationRules($rules: Array<Rule>): Array<MutationRule> {
    return $rules.map<MutationRule>(($rule: Rule): MutationRule => {
        const selectors: Array<MutationRuleSelector> = $rule.selector
            .map(selector => {
                if (isTagRuleSelector(selector)) {
                    return new MutationRuleTagSelector(selector);
                }

                return new MutationRuleAttrSelector(selector);
            });

        const source = new MutationRuleAttrSource($rule.source);

        if(isTagRuleTarget($rule.target)) {
            return new MutationTagRule(selectors, source, $rule.target);
        } else if (isAttrRuleTarget($rule.target)) {
            return new MutationAttrRule(selectors, source, $rule.target);
        }

        return new MutationContentRule(
            selectors,
            source,
            $rule.target,
        );
    });
}
