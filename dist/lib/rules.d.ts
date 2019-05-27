import { DomElement } from "domhandler";
declare type RuleSelectorBase = {
    exclude?: boolean;
};
export declare type TagRuleSelector = {
    tag: string | RegExp;
} & RuleSelectorBase;
export declare function isTagRuleSelector($value: any): $value is TagRuleSelector;
export declare type AttrRuleSelector = {
    attr: string | RegExp;
} & RuleSelectorBase;
export declare function isAttrRuleSelector($value: any): $value is AttrRuleSelector;
export declare type RuleSelector = TagRuleSelector | AttrRuleSelector;
export declare function isRuleSelector($value: any): $value is RuleSelector;
export declare type RuleSourceBase = {
    deserialize?: ($: string) => string;
};
export declare type AttrRuleSource = {
    attr: string | RegExp;
    remove?: boolean;
} & RuleSourceBase;
export declare function isAttrRuleSource($value: any): $value is AttrRuleSource;
export declare type RuleSource = AttrRuleSource;
export declare function isRuleSource($value: any): $value is RuleSource;
export declare type AttrRuleTarget = {
    attr: string;
    serialize?: ($: string) => string;
};
export declare function isAttrRuleTarget($value: any): $value is AttrRuleTarget;
export declare type TagRuleTarget = {
    tag: 'replace';
};
export declare function isTagRuleTarget($value: any): $value is TagRuleTarget;
export declare type ContentRuleTarget = {
    content: 'replace' | 'append' | 'prepend';
};
export declare function isContentRuleTarget($value: any): $value is ContentRuleTarget;
export declare type RuleTarget = TagRuleTarget | AttrRuleTarget | ContentRuleTarget;
export declare function isRuleTarget($value: any): $value is RuleTarget;
export declare type Rule = {
    selector: Array<RuleSelector>;
    source: RuleSource;
    target: RuleTarget;
};
export declare function isRule($value: any): $value is Rule;
export declare abstract class MutationRuleSelector {
    protected readonly negotiate: boolean;
    protected constructor(negotiate: boolean);
    abstract test($element: DomElement): boolean;
}
export declare class MutationRuleTagSelector extends MutationRuleSelector {
    protected readonly tag: RegExp;
    constructor($rule: TagRuleSelector);
    test($element: DomElement): boolean;
}
export declare class MutationRuleAttrSelector extends MutationRuleSelector {
    protected readonly attr: RegExp;
    constructor($rule: AttrRuleSelector);
    test($element: DomElement): boolean;
}
export declare abstract class MutationRuleSource {
    readonly discard: boolean;
    protected constructor(discard: boolean);
    abstract extract($element: DomElement): string;
    abstract clean($element: DomElement): DomElement;
}
export declare class MutationRuleAttrSource extends MutationRuleSource {
    protected static commonDeserializer($value: string): string;
    protected readonly attr: RegExp;
    protected readonly deserialize: ($: string) => string;
    constructor($source: AttrRuleSource);
    protected extractAttribute($element: DomElement): string;
    extract($element: DomElement): string;
    clean($element: DomElement): DomElement;
}
export declare abstract class MutationRule {
    protected readonly selectors: Array<MutationRuleSelector>;
    protected readonly source: MutationRuleSource;
    protected constructor(selectors: Array<MutationRuleSelector>, source: MutationRuleSource);
    test($element: DomElement): boolean;
    extract($element: DomElement): string;
    abstract apply($element: DomElement, $data: string): Promise<DomElement | Array<DomElement>>;
}
export declare class MutationTagRule extends MutationRule {
    protected readonly behaviour: 'replace';
    constructor($selectors: Array<MutationRuleSelector>, $source: MutationRuleSource, $target: TagRuleTarget);
    apply($element: DomElement, $data: string): Promise<DomElement | Array<DomElement>>;
}
export declare class MutationAttrRule extends MutationRule {
    protected static commonSerializer($value: string): string;
    protected readonly attr: string;
    protected readonly serialize: ($value: string) => string;
    constructor($selectors: Array<MutationRuleSelector>, $source: MutationRuleSource, $target: AttrRuleTarget);
    apply($element: DomElement, $data: string): Promise<DomElement>;
}
export declare class MutationContentRule extends MutationRule {
    protected readonly behaviour: 'replace' | 'append' | 'prepend';
    constructor($selectors: Array<MutationRuleSelector>, $source: MutationRuleSource, $target: ContentRuleTarget);
    apply($element: DomElement, $data: string): Promise<DomElement>;
}
export declare function rulesFactory($rules: Array<Rule>): Array<MutationRule>;
export {};
