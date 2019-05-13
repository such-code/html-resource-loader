import { DomElement } from "domhandler";
export declare class DomRenderer {
    /**
     * Wraps the attribute in single or double quotes.
     */
    quote($value: string): string;
    /**
     * Create starting tag for element, if required an additional white space will
     * be added to retain flow of inline elements.
     */
    tag($element: DomElement): string;
    /**
     * Loop set of attributes belonging to an element. Surrounds attributes with
     * quotes if required, omits if not.
     */
    attributes($element: DomElement): string;
    /**
     * Proxy to render HTML.
     */
    open($element: DomElement): string;
    /**
     * Provide closing tag for element if required.
     */
    close($element: DomElement): string;
    /**
     * Check the script is actual script or abused for template/config. Scripts
     * without attribute type or type="text/javascript" are JS elements by default.
     */
    isJS($element: DomElement): boolean;
    /**
     * Check if the element is of type style.
     */
    isStyle($element: DomElement): boolean;
    /**
     * Completely render one element including children.
     */
    renderElement($element: DomElement): string;
    /**
     * Renders array of elements
     */
    renderElements($elements: Array<DomElement>): string;
    /**
     * Return simple text, no special treatment.
     */
    text($element: DomElement): string;
    /**
     * Returned simple comment.
     */
    comment($element: DomElement): string;
    /**
     * Return parsed directive.
     */
    directive($element: DomElement): string;
    script($element: DomElement): string;
    style($element: DomElement): string;
}
