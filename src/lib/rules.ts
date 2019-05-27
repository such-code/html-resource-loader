import {DomElement} from "domhandler";
import {stringToDom, stringToRegExp} from "./utils";

type RuleSelectorBase = {
    exclude?: boolean,
}

export type TagRuleSelector = {
    tag: string | RegExp,
} & RuleSelectorBase

export function isTagRuleSelector($value: any): $value is TagRuleSelector {
    return typeof $value === 'object'
        && 'tag' in $value
        && (
            typeof $value.tag === 'string'
            || $value.tag instanceof RegExp
        );
}


export type AttrRuleSelector = {
    attr: string | RegExp,
    filter?: ($: string) => boolean,
} & RuleSelectorBase

export function isAttrRuleSelector($value: any): $value is AttrRuleSelector {
    return typeof $value === 'object'
        && 'attr' in $value
        && (
            typeof $value.attr === 'string'
            || $value.attr instanceof RegExp
        );
}

export type RuleSelector = TagRuleSelector | AttrRuleSelector

export function isRuleSelector($value: any): $value is RuleSelector {
    return isTagRuleSelector($value)
        || isAttrRuleSelector($value);
}

// ------------------------------------------------------------------------------------------------------------------ //

export type RuleSourceBase = {
    deserialize?: ($: string) => string,
}

export type AttrRuleSource = {
    attr: string | RegExp,
    remove?: boolean
} & RuleSourceBase;

export function isAttrRuleSource($value: any): $value is AttrRuleSource {
    return typeof $value === 'object'
        && 'attr' in $value
        && (
            typeof $value.attr === 'string'
            || $value.attr instanceof RegExp
        );
}

export type RuleSource = AttrRuleSource;

export function isRuleSource($value: any): $value is RuleSource {
    return isAttrRuleSource($value);
}

// ------------------------------------------------------------------------------------------------------------------ //

export type AttrRuleTarget = {
    attr: string,
    serialize?: ($: string) => string,
}

export function isAttrRuleTarget($value: any): $value is AttrRuleTarget {
    return typeof $value === 'object'
        && typeof $value.attr === 'string';
}

export type TagRuleTarget = {
    tag: 'replace',
}

export function isTagRuleTarget($value: any): $value is TagRuleTarget {
    return typeof $value === 'object'
        && $value.tag === 'replace';
}

export type ContentRuleTarget = {
    content: 'replace' | 'append' | 'prepend',
}

export function isContentRuleTarget($value: any): $value is ContentRuleTarget {
    return typeof $value === 'object'
        && (
            $value.content === 'replace'
            || $value.content === 'append'
            || $value.content === 'prepend'
        );
}

export type RuleTarget = TagRuleTarget | AttrRuleTarget | ContentRuleTarget

export function isRuleTarget($value: any): $value is RuleTarget {
    return isAttrRuleTarget($value)
        || isTagRuleTarget($value)
        || isContentRuleTarget($value);
}

// ------------------------------------------------------------------------------------------------------------------ //

export type Rule = {
    selector: Array<RuleSelector>,
    source: RuleSource,
    target: RuleTarget,
}

export function isRule($value: any): $value is Rule {
    return typeof $value === 'object'
        && Array.isArray($value.selector) && $value.selector.every(isRuleSelector)
        && isRuleSource($value.source)
        && isRuleTarget($value.target);
}

// ------------------------------------------------------------------------------------------------------------------ //

export abstract class MutationRuleSelector {
    protected constructor(
        protected readonly negotiate: boolean
    ) {}

    abstract test($element: DomElement): boolean;
}

export class MutationRuleTagSelector extends MutationRuleSelector {
    protected readonly tag: RegExp;

    public constructor($rule: TagRuleSelector) {
        super(typeof $rule.exclude === 'boolean' ? $rule.exclude : false);
        this.tag = typeof $rule.tag === 'string'
            ? stringToRegExp($rule.tag)
            : $rule.tag;
    }

    public test($element: DomElement): boolean {
        const result = $element.type === 'tag' && this.tag.test($element.name);
        return this.negotiate ? !result : result;
    }
}

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

    public test($element: DomElement): boolean {
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

// ------------------------------------------------------------------------------------------------------------------ //

export abstract class MutationRuleSource {
    protected constructor(
        public readonly discard: boolean
    ) { }
    public abstract extract($element: DomElement): string;
    public abstract clean($element: DomElement): DomElement;
}

export class MutationRuleAttrSource extends MutationRuleSource {
    protected static commonDeserializer($value: string): string {
        return $value;
    }

    protected readonly attr: RegExp;
    protected readonly deserialize: ($: string) => string;

    constructor($source: AttrRuleSource) {
        super(typeof $source.remove === 'boolean' ? $source.remove : false);
        this.attr = typeof $source.attr === 'string'
            ? stringToRegExp($source.attr)
            : $source.attr;
        this.deserialize = typeof $source.deserialize === 'function'
            ? $source.deserialize
            : MutationRuleAttrSource.commonDeserializer;
    }

    protected extractAttribute($element: DomElement): string {
        return Object.keys($element.attribs).find($ => this.attr.test($))
    }

    public extract($element: DomElement): string {
        return this.deserialize(
            $element.attribs[this.extractAttribute($element)]
        );
    }

    public clean($element: DomElement): DomElement {
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

// ------------------------------------------------------------------------------------------------------------------ //

export abstract class MutationRule {
    protected constructor(
        protected readonly selectors: Array<MutationRuleSelector>,
        protected readonly source: MutationRuleSource,
    ) { }

    public test($element: DomElement): boolean {
        return this.selectors.every($ => $.test($element));
    }

    public extract($element: DomElement): string {
        return this.source.extract($element);
    }

    public abstract apply($element: DomElement, $data: string): Promise<DomElement | Array<DomElement>>;
}

export class MutationTagRule extends MutationRule {
    protected readonly behaviour: 'replace';

    public constructor(
        $selectors: Array<MutationRuleSelector>,
        $source: MutationRuleSource,
        $target: TagRuleTarget,
    ) {
        super($selectors, $source);
        this.behaviour = $target.tag;
    }

    public apply($element: DomElement, $data: string): Promise<DomElement | Array<DomElement>> {
        return stringToDom($data)
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

export class MutationAttrRule extends MutationRule {
    protected static commonSerializer($value: string): string {
        return $value;
    }

    protected readonly attr: string;
    protected readonly serialize: ($value: string) => string;

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

    public apply($element: DomElement, $data: string): Promise<DomElement> {
        if (this.source.discard) {
            $element = this.source.clean($element);
        }

        $element.attribs = {
            ...$element.attribs,
            [this.attr]: $data,
        };
        return Promise.resolve($element);
    }
}

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

    public apply($element: DomElement, $data: string): Promise<DomElement> {
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

// ------------------------------------------------------------------------------------------------------------------ //

export function rulesFactory($rules: Array<Rule>): Array<MutationRule> {
    const result: Array<MutationRule> = [];
    for (let rule of $rules) {
        if (isRule(rule)) {
            const selectors: Array<MutationRuleSelector> = [];
            for (let selector of rule.selector) {
                if (isTagRuleSelector(selector)) {
                    selectors.push(new MutationRuleTagSelector(selector));
                } else if (isAttrRuleSelector(selector)) {
                    selectors.push(new MutationRuleAttrSelector(selector));
                }
            }

            let source: MutationRuleSource;
            if (isAttrRuleSource(rule.source)) {
                source = new MutationRuleAttrSource(rule.source);
            }

            if(isTagRuleTarget(rule.target)) {
                result.push(new MutationTagRule(
                    selectors,
                    source,
                    rule.target,
                ));
            } else if (isAttrRuleTarget(rule.target)) {
                result.push(new MutationAttrRule(
                    selectors,
                    source,
                    rule.target,
                ));
            } else if (isContentRuleTarget(rule.target)) {
                result.push(new MutationContentRule(
                    selectors,
                    source,
                    rule.target,
                ));
            }
        } else {
            // This is an Error, do something.
        }
    }
    return result;
}
