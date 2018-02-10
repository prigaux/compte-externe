'use strict';

import * as _ from 'lodash';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as Mustache from 'mustache';
import * as helpers from './helpers';
import * as utils from './utils';
import * as conf from './conf';

const parseString: (xml: string, options: xml2js.Options) => Promise<any> = helpers.promisify_callback(xml2js.parseString);
const readFile = helpers.promisify_callback(fs.readFile);

// alike xpath //k
function deepGetKey(o, k) {
    if (!o) {
        return undefined;
    } else if (k in o) {
        return o[k];
    } else if (_.isArray(o)) {
        return o.length === 1 && deepGetKey(o[0], k);
    } else {
        let ks = _.keys(o);
        return ks.length === 1 && deepGetKey(o[ks[0]], k);
    }
}

function raw_soap(url, body) {
    let headers = {
        SOAPAction: "",
        "content-type": "text/xml",
    };
    return utils.post(url, body, { headers }).then(result => (
        parseString(result, { explicitArray: false, ignoreAttrs: true })
    ));
}

function soap(templateName, params) {
    let templateFile = __dirname + "/templates/esup-activ-bo/" + templateName;
    return readFile(templateFile).then(data => (
        Mustache.render(data.toString(), params)
    )).then(body => {
        //console.log(body);
        return raw_soap(conf.esup_activ_bo.url, body);
    });
}

function get_fault(xml) {
    let fault = deepGetKey(xml, 'soap:Fault');
    return fault && fault.faultstring;
}

// returns a code which allows setPassword
function _validateAccount(uid: string): Promise<string> {
    console.log("esup_activ_bo._validateAccount " + uid);
    let params = { uid };
    return soap("validateAccount.xml", params).then(xml => {
        //console.dir(xml, { depth: null });
        let response = deepGetKey(xml, 'ns1:validateAccountResponse');
        let entries = deepGetKey(response, 'entry');
        if (_.isArray(entries)) {
            let vals = _.zipObject(_.map(entries, 'key'), _.map(entries, 'value'));
            if (!vals['code']) throw "esup_activ_bo.validateAccount did not return code for uid " + uid + ". Account already activated?";
            return vals['code'];
        } else {
            throw "esup_activ_bo.validateAccount failed: " + (get_fault(xml) || JSON.stringify(xml));
        }
    });
}

// returns a code which allows setPassword
function _setPassword(supannAliasLogin: string, code: string, password: string) {
    console.log("esup_activ_bo._setPassword " + supannAliasLogin + " using code " + code);
    let params = { id: supannAliasLogin, code, password };
    return soap("setPassword.xml", params).then(xml => {
        console.dir(xml, { depth: null });
        let response = deepGetKey(xml, 'ns1:setPasswordResponse');
        if (response === '') return; // OK!
        else throw "esup_activ_bo.setPassword failed: " + (get_fault(xml) || JSON.stringify(xml));
    });
}

export const setPassword = (uid: string, supannAliasLogin: string, password: string) => (
    _validateAccount(uid).then(code => (
        code && _setPassword(supannAliasLogin, code, password)
    ))
);
