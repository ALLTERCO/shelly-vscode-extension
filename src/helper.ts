export const referenceRegex = /\/\/\/\s*<reference\s+.*\/>/;
export const TS_REFERENCE = `/// <reference path="../../shelly-script.d.ts" />\n`

function hasTsReference(code: string){
    const firstLine = code.split('\n')[0];
    return firstLine.startsWith(TS_REFERENCE) || firstLine.match(referenceRegex);
}

export function addTSReference(code: string){
    return hasTsReference(code) ? code : TS_REFERENCE + code; 
}

export function removeTsReference(code: string){
    return hasTsReference(code) ? code.substring(code.indexOf('\n') + 1) : code;
}