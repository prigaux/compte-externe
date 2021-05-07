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
function deepGetKey(o: any, k: string): any {
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

function raw_soap(url: string, body: string, req_for_context: req) {
    let headers = {
        SOAPAction: "",
        "content-type": "text/xml",
	    "Client-IP": req_for_context.ip,
	    "Client-User-Agent": req_for_context.get('User-Agent'),
    };
    return utils.post(url, body, { headers }).then(result => (
        parseString(result, { explicitArray: false, ignoreAttrs: true })
    ));
}

function soap(templateName: string, params: Dictionary<any>, opts : { req_for_context: req, responseTag: string, fault_to_string?: (_: any) => string }) {
    if (!conf.esup_activ_bo.url) throw "configuration issue: conf.esup_activ_bo.url is missing";
    let templateFile = __dirname + "/templates/esup-activ-bo/" + templateName;
    return readFile(templateFile).then(data => (
        Mustache.render(data.toString(), helpers.mapLeaves(params, helpers.escapeXml))
    )).then(body => {
        //console.log(body);
        const operation = conf.esup_activ_bo.url.replace(/\/AccountManagement$/, '') + '/' + (templateName.match(/Cas/) ? 'CasAccountManagement' : 'AccountManagement');
        return raw_soap(operation, body, opts.req_for_context);
    }).then(xml => {
        //console.dir(xml, { depth: null });
        let response = deepGetKey(xml, opts.responseTag);
        if (response === undefined) throw JSON.stringify(xml);
        return response;
    }).catch(async err => {
        if (err?.error) {
            try {	
	       const xml = await parseString(err.error, { explicitArray: false, ignoreAttrs: true })
               err = get_fault(xml, opts.fault_to_string) || JSON.stringify(xml);
	    } catch (e) {}
        }
        throw err
    })
}

const fault_detail_key = (fault: any) => fault.detail && Object.keys(fault.detail)[0]

// Example of response:
// <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><soap:Fault><faultcode>soap:Server</faultcode><faultstring>Identification ...chou..e : (&amp;(supannEmpId=14464)(up1BirthDay=19741002000000Z))</faultstring><detail><AuthentificationException xmlns="http://remote.services.activbo.esupportail.org" /></detail></soap:Fault></soap:Body></soap:Envelope>
function get_fault(xml: any, to_string: any = undefined) {
    let fault = deepGetKey(xml, 'soap:Fault');
    return fault && (to_string && to_string(fault) || fault.faultstring);
}

function _get_entries(response: any) {
    let entries = deepGetKey(response, 'entry');
    if (!_.isArray(entries)) return undefined;
    let r = _.zipObject(_.map(entries, 'key'), _.map(entries, 'value'));
    r = _.pickBy(r, val => val !== '');
    r = _.mapValues(r, val => helpers.split_terminator(val, conf.esup_activ_bo.multiValue_separator));
    return r;
}

// returns "attrPersoInfo" + code, mail, supannAliasLogin
// throws: "Authentification invalide pour l'utilisateur xxx"
// throws: "Login invalide"
export const authentificateUser = (supannAliasLogin: string, password: string, attrPersoInfo: string[], req_for_context: req) => (
    soap("authentificateUser.xml", { id: supannAliasLogin, password, attrPersoInfo }, 
         { responseTag: 'ns1:authentificateUserResponse', req_for_context }).then(_get_entries)
)

export const authentificateUserWithCas = (supannAliasLogin: string, proxyticket: string, targetUrl: string, attrPersoInfo: string[], req_for_context: req) => (
    soap("authentificateUserWithCas.xml", { id: supannAliasLogin, proxyticket, targetUrl, attrPersoInfo }, 
         { responseTag: 'ns1:authentificateUserWithCasResponse', req_for_context }).then(_get_entries)
)

// returns "attrPersoInfo" + possibleChannels, mail, supannAliasLogin + code if account is not activated
// ("code" is useful for setPassword or validateCode)
// throws: "AuthentificationException"
export function validateAccount(userInfoToValidate: Dictionary<string>, attrPersoInfo: string[], req_for_context: req): Promise<Dictionary<string>> {
    console.log("esup_activ_bo._validateAccount " + JSON.stringify(userInfoToValidate));
    const hashInfToValidate = _.map(userInfoToValidate, (value, key) => ({ value, key }));
    let params = { hashInfToValidate, attrPersoInfo };
    return soap("validateAccount.xml", params, 
                { responseTag: 'ns1:validateAccountResponse', fault_to_string: fault_detail_key, req_for_context }).then(_get_entries);
}

// throws: "UserPermissionException"
export const updatePersonalInformations = (supannAliasLogin: string, code: string, userInfo: Dictionary<string | string[]>, req_for_context: req) => {
    const hashBeanPersoInfo = _.map(userInfo, (value, key) => {
        if (_.isArray(value)) value = value.join(conf.esup_activ_bo.multiValue_separator)
        return { value, key }
    });
    return soap("updatePersonalInformations.xml", { id: supannAliasLogin, code, hashBeanPersoInfo },
                { responseTag: 'ns1:updatePersonalInformationsResponse', fault_to_string: fault_detail_key, req_for_context })
}
    
async function _getCode(hashInfToValidate: Dictionary<string>, req_for_context: req): Promise<string> {
    const vals = await validateAccount(hashInfToValidate, [], req_for_context);
    if (!vals.code) throw "esup_activ_bo.validateAccount did not return code for " + JSON.stringify(hashInfToValidate) + ". Account already activated?";
    return vals.code;
}

// NB: no error in case of unknown channel
// throws: "Utilisateur xxx inconnu"
// throws: "Utilisateur sdianat n'a pas de mail perso"
export const sendCode = (supannAliasLogin: string, channel: string, req_for_context: req) => (
    // Response in case of success:
    // <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:sendCodeResponse xmlns:ns1="http://remote.services.activbo.esupportail.org" /></soap:Body></soap:Envelope>    
    soap("sendCode.xml", { id: supannAliasLogin, channel },
         { responseTag: 'ns1:sendCodeResponse', req_for_context }).then(response => {
        if (response === '') return; // OK!
        else throw "unexpected sendCode error: " + JSON.stringify(response);
    })
);

export const validateCode = (supannAliasLogin: string, code: string, req_for_context: req) => (
    // Response in case of success:
    // <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soap:Body><ns1:validateCodeResponse xmlns:ns1="http://remote.services.activbo.esupportail.org"><ns1:out>true</ns1:out></ns1:validateCodeResponse></soap:Body></soap:Envelope>
    soap("validateCode.xml", { id: supannAliasLogin, code }, { responseTag: 'ns1:validateCodeResponse', req_for_context }).then(response => {
        return response['ns1:out'] === 'true';
    })
);

export function validatePassword(supannAliasLogin: string, password: string, req_for_context: req) {
    let params = { supannAliasLogin, password };
    return soap("validatePassword.xml", params, { responseTag: 'ns1:out', req_for_context }).then(response => {
        if (response === '') return; // OK!
        let err = response
        err = err.replace(/^kadmin: kadm5_check_password_quality: /, '');
        // below non translated messages should be caught by app/src/attrs/PasswordAttr.vue "passwordPattern":
        // "Password doesn't meet complexity requirement." 
        // "Password too short"

        err = err.replace(/^External password quality program failed: /, '');
        // below non translated messages should be caught by app/src/attrs/PasswordAttr.vue "passwordPattern":
        // "Password contains non-ASCII or control characters"
        // "Password is only letters and spaces"
        const translate: Dictionary<string> = {
            "Password does not contain enough unique characters": "Le mot de passe doit contenir plus de caractères différents",
            "it is based on a dictionary word": "Ce mot de passe est trop proche d'un mot du dictionnaire ou d'un mot de passe connu",
        }
        throw translate[err] || err;
    });
}

export function setPassword(supannAliasLogin: string, code: string, password: string, req_for_context: req) {
    console.log("esup_activ_bo._setPassword " + supannAliasLogin + " using code " + code);
    let params = { id: supannAliasLogin, code, password };
    return soap("setPassword.xml", params, { responseTag: 'ns1:setPasswordResponse', req_for_context }).then(response => {
        if (response === '') return; // OK!
        else throw "unexpected setPassword error: " + JSON.stringify(response);
    });
}

// TODO
//export const changeLogin = (supannAliasLogin: string, code: string, newLogin: string, currentPassword: string) => ...
//export const changeLogin = (supannAliasLogin: string, code: string, newLogin: string) => ...

export const setNewAccountPassword = (uid: string, supannAliasLogin: string, password: string, req_for_context: req) => (
    _getCode({ uid }, req_for_context).then(code => (
        code && setPassword(supannAliasLogin, code, password, req_for_context)
    ))
);
