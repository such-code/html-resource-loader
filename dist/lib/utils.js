"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const htmlparser2_1 = require("htmlparser2");
function stringToRegExp($string) {
    return new RegExp(`^${$string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
}
exports.stringToRegExp = stringToRegExp;
function stringToDom($data) {
    return new Promise(($resolve, $reject) => {
        const parser = new htmlparser2_1.Parser(new htmlparser2_1.DomHandler(($error, $dom) => {
            if ($error) {
                $reject($error);
            }
            else {
                $resolve($dom);
            }
        }), {
            lowerCaseTags: false,
            lowerCaseAttributeNames: false
        });
        parser.parseComplete($data);
    });
}
exports.stringToDom = stringToDom;
//# sourceMappingURL=utils.js.map