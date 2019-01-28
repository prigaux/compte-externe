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
        return o.length === 1 ? deepGetKey(o[0], k) : undefined;
    } else {
        let ks = _.keys(o);
        return ks.length === 1 ? deepGetKey(o[ks[0]], k) : undefined;
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

function soap(templateName, params, opts : { responseTag: string, fault_to_string?: (any) => string }) {
    let templateFile = __dirname + "/templates/esup-activ-bo/" + templateName;
    return readFile(templateFile).then(data => (
        Mustache.render(data.toString(), params)
    )).then(body => {
        //console.log(body);
        return raw_soap(conf.esup_activ_bo.url, body);
    }).then(xml => {
        //console.dir(xml, { depth: null });
        let response = deepGetKey(xml, opts.responseTag);
        if (response === undefined) throw get_fault(xml, opts.fault_to_string) || JSON.stringify(xml);
        return response;
    })
}

const fault_detail_key = (fault) => fault.detail && Object.keys(fault.detail)[0]

function get_fault(xml, to_string = undefined) {
    let fault = deepGetKey(xml, 'soap:Fault');
    return fault && (to_string && to_string(fault) || fault.faultstring);
}

// returns a code which allows setPassword
function _validateAccount(uid: string): Promise<string> {
    console.log("esup_activ_bo._validateAccount " + uid);
    let params = { uid };
    return soap("validateAccount.xml", params, 
                { responseTag: 'ns1:validateAccountResponse', fault_to_string: fault_detail_key }).then(response => {
        let entries = deepGetKey(response, 'entry');
        if (_.isArray(entries)) {
            let vals = _.zipObject(_.map(entries, 'key'), _.map(entries, 'value'));
            if (!vals['code']) throw "esup_activ_bo.validateAccount did not return code for uid " + uid + ". Account already activated?";
            return vals['code'];
        } else {
            throw "esup_activ_bo.validateAccount failed: " + JSON.stringify(response);
        }
    });
}

function _setPassword(supannAliasLogin: string, code: string, password: string) {
    console.log("esup_activ_bo._setPassword " + supannAliasLogin + " using code " + code);
    let params = { id: supannAliasLogin, code, password };
    return soap("setPassword.xml", params, { responseTag: 'ns1:setPasswordResponse' }).then(response => {
        if (response === '') return; // OK!
        else throw "unexpected setPassword error: " + JSON.stringify(response);
    });
}

export const setPassword = (uid: string, supannAliasLogin: string, password: string) => (
    _validateAccount(uid).then(code => (
        code && _setPassword(supannAliasLogin, code, password)
    ))
);
