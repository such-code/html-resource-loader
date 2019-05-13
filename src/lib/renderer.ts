import {DomElement} from "domhandler";
import {List} from "./list";

'use strict';

export class DomRenderer {
    /**
     * Wraps the attribute in single or double quotes.
     */
    public quote($value: string): string {
        if (!$value) {
            return '""';
        }
        const delimiter = /\"/.test($value) ? "'" : '"';
        return delimiter + $value + delimiter;
    };

    /**
     * Create starting tag for element, if required an additional white space will
     * be added to retain flow of inline elements.
     */
    public tag($element: DomElement): string {
        return `<${$element.name}${this.attributes($element)}>`;
    };

    /**
     * Loop set of attributes belonging to an element. Surrounds attributes with
     * quotes if required, omits if not.
     */
    public attributes($element: DomElement): string {
        if (typeof $element.attribs === 'object' && $element.attribs !== null) {
            return Object.keys($element.attribs)
                .reduce(($result, $key) => {
                    // Return full attribute with value.
                    return `${$result} ${$key}=${this.quote($element.attribs[$key])}`;
                }, '');
        }
        return '';
    };

    /**
     * Proxy to render HTML.
     */
    public open($element: DomElement): string {
        return $element.type in this && this[$element.type]($element);
    };

    /**
     * Provide closing tag for element if required.
     */
    public close($element: DomElement): string {
        return List.node.has($element.type) && !List.singular.has($element.name)
            ? `</${$element.name}>`
            : '';
    };

    /**
     * Check the script is actual script or abused for template/config. Scripts
     * without attribute type or type="text/javascript" are JS elements by default.
     */
    public isJS($element: DomElement): boolean {
        return $element.type === 'script' &&
            (
                !$element.attribs ||
                (!$element.attribs.type || $element.attribs.type === 'text/javascript')
            );
    };

    /**
     * Check if the element is of type style.
     */
    public isStyle($element: DomElement): boolean {
        return $element.type === 'style';
    };

    /**
     * Completely render one element including children.
     */
    public renderElement($element: DomElement): string {
        return this.open($element) +
            this.renderElements($element.children) +
            this.close($element);
    }

    /**
     * Renders array of elements
     */
    public renderElements($elements: Array<DomElement>): string {
        return Array.isArray($elements)
            ? $elements.map(this.renderElement.bind(this)).join('')
            : ''
    }

    /**
     * Return simple text, no special treatment.
     */
    public text($element: DomElement): string {
        return $element.data;
    };

    /**
     * Returned simple comment.
     */
    public comment($element: DomElement): string {
        return `<!--${$element.data}-->`;
    };

    /**
     * Return parsed directive.
     */
    public directive($element: DomElement): string {
        return `<${$element.data}>`;
    };

    // Define some proxies for easy external reference.
    public script($element: DomElement): string {
        return this.tag($element);
    }

    public style($element: DomElement): string {
        return this.tag($element);
    }
}
