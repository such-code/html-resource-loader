import { Element, Node } from "domhandler/lib";
import { AttrRuleSelector, AttrRuleSource, AttrRuleTarget, ContentRuleTarget, Rule, TagRuleSelector, TagRuleTarget, TypeRuleSelector } from './rules-configuration';
/**
 * Abstract class for selector rules. Is used as a selection behaviour for MutationRule.
 */
export declare abstract class MutationRuleSelector {
    protected readonly negotiate: boolean;
    protected constructor(negotiate: boolean);
    /**
     * Shows if element passes rule checks.
     * @param $element
     * @returns boolean
     */
    abstract test($element: Element): boolean;
}
/**
 * Rule to test element type.
 */
export declare class MutationRuleTypeSelector extends MutationRuleSelector {
    protected readonly type: string;
    constructor($rule: TypeRuleSelector);
    test($element: Element): boolean;
}
/**
 * Rule to test element tag name.
 */
export declare class MutationRuleTagSelector extends MutationRuleSelector {
    protected readonly tag: RegExp;
    constructor($rule: TagRuleSelector);
    test($element: Element): boolean;
}
/**
 * Rule to filter element by attribute/attribute value.
 */
export declare class MutationRuleAttrSelector extends MutationRuleSelector {
    protected static commonFilter($: string): boolean;
    protected readonly attr: RegExp;
    protected readonly filter: ($: string) => boolean;
    constructor($rule: AttrRuleSelector);
    test($element: Element): boolean;
}
/**
 * Abstract class for all rules to extract resource source path. Is used as a source extraction behaviour for
 * MutationRule.
 */
export declare abstract class MutationRuleSource {
    protected static defaultResolver($context: string, $path: string): Promise<string>;
    readonly hasResolver: boolean;
    readonly resolve: ($context: string, $path: string) => string | Promise<string>;
    protected constructor($resolve?: (($context: string, $path: string) => string | Promise<string>));
    /**
     * Returns resource path for this Element.
     * @param $element
     * @returns string
     */
    abstract extract($element: Element): string;
    /**
     * Prepares element for further processing. By default specific processing is not required.
     * @param $element Element
     */
    prepare($element: Element): Element;
}
/**
 * Rule used to extract resource path from Element attributes.
 */
export declare class MutationRuleAttrSource extends MutationRuleSource {
    protected static commonDeserializer($value: string): string;
    protected readonly attr: RegExp;
    protected readonly deserialize: ($: string) => string;
    protected readonly discardAttr: boolean;
    constructor($source: AttrRuleSource);
    protected extractAttribute($element: Element): string;
    extract($element: Element): string;
    prepare($element: Element): Element;
}
/**
 * Abstract rule used as an aggregator for selection, source and target rules. These rules are used for processing.
 */
export declare abstract class MutationRuleTarget {
    /**
     * Applies mutation to an Element.
     * @param $element
     * @param $data
     * @returns Promise<Node | Array<Node>> single or multiple nodes could be returned in a result.
     */
    abstract apply($element: Element, $data: string): Promise<Node | Array<Node>>;
    /**
     *
     */
    get shouldBeUsed(): boolean;
}
/**
 * Mutates whole Element.
 */
export declare class MutationTagRule extends MutationRuleTarget {
    protected static commonSerializer($: Node | Array<Node>, $prev: Element): Node | Array<Node>;
    protected static simplifyDom($dom: Array<Node>): Node | Array<Node>;
    protected readonly behaviour: 'replace';
    protected readonly serialize: ($: Node | Array<Node>, $prev: Element) => Node | Array<Node>;
    protected readonly trimContent: boolean;
    constructor($target: TagRuleTarget);
    apply($element: Element, $data: string): Promise<Node | Array<Node>>;
}
/**
 * Rule to mutate Elements attribute.
 */
export declare class MutationAttrRule extends MutationRuleTarget {
    protected static commonSerializer($value: string): string;
    protected readonly attr: string;
    protected readonly serialize: ($value: string, $previous?: string) => string;
    constructor($target: AttrRuleTarget);
    apply($element: Element, $data: string): Promise<Element>;
}
/**
 * Rule to mutate Elements child nodes.
 */
export declare class MutationContentRule extends MutationRuleTarget {
    protected readonly behaviour: 'replace' | 'append' | 'prepend';
    constructor($target: ContentRuleTarget);
    apply($element: Element, $data: string): Promise<Element>;
}
export declare class MutationRule {
    protected readonly selectors: Array<MutationRuleSelector>;
    protected readonly source: MutationRuleSource;
    protected readonly target: Array<MutationRuleTarget>;
    constructor(selectors: Array<MutationRuleSelector>, source: MutationRuleSource, $target: MutationRuleTarget | Array<MutationRuleTarget>);
    /**
     * Checks is all selector rules match Element.
     * @param $element
     * @returns boolean
     */
    test($element: Element): boolean;
    /**
     * Returns resource source path for this Element.
     * @param $element
     */
    extract($element: Element): string;
    /**
     * @param $context
     * @param $path
     */
    resolve($context: string, $path: string): string | Promise<string>;
    /**
     * Applies mutation to an Element.
     * @param $element
     * @param $data
     * @returns Promise<Node | Array<Node>> single or multiple nodes could be returned in a result.
     */
    apply($element: Element, $data: string): Promise<Node | Array<Node>>;
    get hasResolver(): boolean;
}
/**
 * Converts rule definitions from configuration ot MutationRules.
 * @param $rules received from configuration. They must be already type checked.
 * @returns Array<MutationRuleBase>
 */
export declare function convertToMutationRules($rules: Array<Rule>): Array<MutationRule>;
//# sourceMappingURL=rules-internal.d.ts.map