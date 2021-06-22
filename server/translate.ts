import * as express from 'express'
import * as parser from 'accept-language-parser'
import * as utils from './utils'

let _all_translations: Dictionary<Dictionary<string>> = {}

export const add_translations = (translations : Dictionary<Dictionary<string>>) => {
    //console.log('add_translations', _all_translations, translations)
    _all_translations = utils.deep_extend(_all_translations, translations)
}

export const express_handler: express.RequestHandler = (req, _res, next) => {
    const preferred_lang = parser.pick(Object.keys(_all_translations), req.headers["accept-language"] as string)
    //console.log("preferred_lang", preferred_lang, "for", parser.parse(req.headers["accept-language"] as string));
    const translations_ = _all_translations[preferred_lang || 'en'];
    (req as req).translate = (msg: string, opts) => (
        //translations_?.[msg] || console.log("missing translation", msg),
        translations_?.[msg] || (opts?.null_if_unknown ? null : msg)
    )
    next()
}
