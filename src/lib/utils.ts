import {DomElement, DomHandler, Parser} from "htmlparser2";

export function stringToRegExp($string: string): RegExp {
    return new RegExp(`^${$string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
}

export function stringToDom($data: string): Promise<Array<DomElement>> {
    return new Promise<Array<DomElement>>(($resolve, $reject) => {
        const parser = new Parser(
            new DomHandler(($error: any, $dom: Array<DomElement>) => {
                if ($error) {
                    $reject($error);
                } else {
                    $resolve($dom);
                }
            }),
            {
                lowerCaseTags: false,
                lowerCaseAttributeNames: false
            }
        );
        parser.parseComplete($data);
    });
}
