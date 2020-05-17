### @such-code/html-resource-loader

#### Installation

```bash
npm i -D @such-code/html-resource-loader
```

Webpack loader to parse html markup and load all configured resources. Should be configured with rules. Loaded resource result will be *executed* to get content (commonjs module required for this operation). 

#### Rules

Loader options consists of array of rules that specify which resources should be loaded and how to treat the result.

##### Rule structure
```typescript
import { Element, Node } from 'domhandler/lib';

/**
 * Object layout to represent loader rule.
 */
export declare type Rule = {
    /** All selectors must match to add element for processing. */
    selector: Array<TagRuleSelector | AttrRuleSelector>;
    /** Determines what should be taken as a resource paths source. */
    source: AttrRuleSource;
    /** How Element will mutate after successful rule application. */
    target: TagRuleTarget | AttrRuleTarget | ContentRuleTarget;
};

// --- SELECTORS --- //

/**
 * Represents configuration object for selecting tag.
 */
export declare type TagRuleSelector = {
    /** Tag name or RegExp to match multiple similar tags. */
    tag: string | RegExp;
    /** Optional param to invert result of selection. */
    exclude?: boolean;
};
/**
 * Configuration object to represent attribute selector.
 */
export declare type AttrRuleSelector = {
    /** Attribute name or RegExp to math multiple attribute names. */
    attr: string | RegExp;
    /** Optional param to invert result of selection. */
    exclude?: boolean;
    /** Filter result by attribute content. */
    filter?: ($: string) => boolean;
};

// --- SOURCE --- //

/**
 * Represent object to extract resource path.
 */
export declare type AttrRuleSource = {
    /** Attribute name or RegExp (only first match will be used, so make sure you know what are you doing). */
    attr: string | RegExp;
    /** Optional flag to remove specified attribute in processed Node. Default `false`. */
    remove?: boolean;
    /** Optional function if specific source extraction is required. */
    deserialize?: ($: string) => string;
    /**
     * By default resolution is made by webpack and it is correct approach, but if it is really required to do
     * something special custom resolver could be used.
     */
    resolve?: ($context: string, $path: string) => string | Promise<string>;
};

// --- TARGET --- //

/**
 * Represent target as an attribute to contain processed resource result.
 */
export declare type AttrRuleTarget = {
    /** Attribute name where result will be placed. */
    attr: string;
    /** Optional serialization function if specific handling is required. */
    serialize?: ($: string, $prev?: string) => string;
};
/**
 * Represents source element tag as a target for processed content. Only option is ot replace original tag.
 */
export declare type TagRuleTarget = {
    /** Only option for the moment. Tag can only be replaced. */
    tag: 'replace';
    /** Optional serialization function for specific treatment. */
    serialize?: ($: Node | Array<Node>, $prev: Element) => Node | Array<Node>;
    /** Removes newlines and spaces from an end and beginning of received data. Default value is `true`. */
    trimContent?: boolean;
};
/**
 * Target for initial element child content manipulation.
 */
export declare type ContentRuleTarget = {
    /**
     * Specifies content handling strategy. To replace possible Element content use 'replace'. To insert result in the
     * beginning of Element child nodes use 'prepend'. 'append' will insert result in the end of child nodes.
     */
    content: 'replace' | 'append' | 'prepend';
};
```

#### How to use

Configure all rules to process html resources and pass them to loader using options.

##### Configuration example

Check `webpack.config.js` for more.

Imagine you need to load images from style attribute.
```html
<div class="border border-info p-2" style="background-image: url(src/test/assets/mobile.gif); --md-background-image: url(src/test/assets/desktop.gif)">
    Example.
</div>
```

Load could be configured like that to process those resources.
```javascript
/**
 * Parses html style content into object `{ [styleName: string]: string }`.
 */
function extractStyleAsObject($style) {
    return $style
        .split(';')
        .filter($ => $.length > 1)
        .reduce(($acc, $expr) => {
            let [style, value] = $expr.split(':', 2);
            return {
                ...$acc,
                [style.trim()]: value.trim(),
            };
        }, {});
}
/**
 * Converts result of extractStyleAsObject back to string.
 */
function renderStyleObject($style) {
    return Object
        .keys($style)
        .map($ => {
            return `${$}:${$style[$]}`;
        })
        .join(';')
}
/**
 * RegExp for `url(link/to/resource.ext)` extraction.
 */
const URL_REGEX = /^url\(("|'|)((?:.(?!\1\)))*.)\1\)$/;
/**
 * Extracts resource path from `url(path/to/resource.ext)` | `url('res.ext')` | `url("name.ext")` 
 */
function extractFromUrl($) {
    if (URL_REGEX.test($)) {
        return $.replace(URL_REGEX, '$2');
    }
    return $;
}
/**
 * Rule factory for html element style processing.
 */
function buildStyleUrlRule($styleName) {
    return {
        selector: [
            {
                // Select element with style attribute.
                attr: 'style',
                // Filter out element where style has `$styleName`.
                filter: $ => {
                    const style = extractStyleAsObject($);
                    return $styleName in style;
                }
            }
        ],
        source: {
            // Use style attribute content as a source.
            attr: 'style',
            // Return only resource path for only specified style parameter.
            deserialize: $ => {
                const style = extractStyleAsObject($);
                return extractFromUrl(style[$styleName]);
            }
        },
        target: {
            // Loaded result must be inserted back to style attribute.
            attr: 'style',
            // Specific serialization is required to update only one parameter.
            serialize: ($url, $attrValue) => {
                const style = extractStyleAsObject($attrValue);
                style[$styleName] = `url(${$url})`;
                return renderStyleObject(style);
            }
        }
    };
}

const resourceLoaderRules = [
    buildStyleUrlRule('background-image'),
    buildStyleUrlRule('--md-background-image'),
];

module.exports = {
    ...{},
    module: {
        rules: [
            {
                test: /\.html?$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[path][name].[ext]',
                        }
                    },
                    {
                        loader: '@such-code/html-resource-loader',
                        options: {
                            rules: resourceLoaderRules
                        }
                    }
                ],
            },
            {
                test: /\.gif$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'images/[path][name].[ext]',
                            limit: 1000
                        }
                    }
                ]
            },
        ]
    },
};
```
