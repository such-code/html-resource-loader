"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("./list");
'use strict';
class DomRenderer {
    /**
     * Wraps the attribute in single or double quotes.
     */
    quote($value) {
        if (!$value) {
            return '""';
        }
        const delimiter = /\"/.test($value) ? "'" : '"';
        return delimiter + $value + delimiter;
    }
    ;
    /**
     * Create starting tag for element, if required an additional white space will
     * be added to retain flow of inline elements.
     */
    tag($element) {
        return `<${$element.name}${this.attributes($element)}>`;
    }
    ;
    /**
     * Loop set of attributes belonging to an element. Surrounds attributes with
     * quotes if required, omits if not.
     */
    attributes($element) {
        if (typeof $element.attribs === 'object' && $element.attribs !== null) {
            return Object.keys($element.attribs)
                .reduce(($result, $key) => {
                // Return full attribute with value.
                return `${$result} ${$key}=${this.quote($element.attribs[$key])}`;
            }, '');
        }
        return '';
    }
    ;
    /**
     * Proxy to render HTML.
     */
    open($element) {
        return $element.type in this && this[$element.type]($element);
    }
    ;
    /**
     * Provide closing tag for element if required.
     */
    close($element) {
        return list_1.List.node.has($element.type) && !list_1.List.singular.has($element.name)
            ? `</${$element.name}>`
            : '';
    }
    ;
    /**
     * Check the script is actual script or abused for template/config. Scripts
     * without attribute type or type="text/javascript" are JS elements by default.
     */
    isJS($element) {
        return $element.type === 'script' &&
            (!$element.attribs ||
                (!$element.attribs.type || $element.attribs.type === 'text/javascript'));
    }
    ;
    /**
     * Check if the element is of type style.
     */
    isStyle($element) {
        return $element.type === 'style';
    }
    ;
    /**
     * Completely render one element including children.
     */
    renderElement($element) {
        return this.open($element) +
            this.renderElements($element.children) +
            this.close($element);
    }
    /**
     * Renders array of elements
     */
    renderElements($elements) {
        return Array.isArray($elements)
            ? $elements.map(this.renderElement.bind(this)).join('')
            : '';
    }
    /**
     * Return simple text, no special treatment.
     */
    text($element) {
        return $element.data;
    }
    ;
    /**
     * Returned simple comment.
     */
    comment($element) {
        return `<!--${$element.data}-->`;
    }
    ;
    /**
     * Return parsed directive.
     */
    directive($element) {
        return `<${$element.data}>`;
    }
    ;
    // Define some proxies for easy external reference.
    script($element) {
        return this.tag($element);
    }
    style($element) {
        return this.tag($element);
    }
}
exports.DomRenderer = DomRenderer;
//# sourceMappingURL=renderer.js.map