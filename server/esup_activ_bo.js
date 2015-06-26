'use strict';

var _ = require('lodash');
var fs = require('fs');
var xml2js = require('xml2js');
var Mustache = require('mustache');
var helpers = require('./helpers');
var conf = require('./conf');

var parseString = helpers.promisify_callback(xml2js.parseString);
var readFile = helpers.promisify_callback(fs.readFile);

// alike xpath //k
function deepGetKey(o, k) {
    if (!o) {
	return undefined;
    } else if (k in o) {
	return o[k];
    } else if (_.isArray(o)) {
	return o.length === 1 && deepGetKey(o[0], k);
    } else {
	var ks = _.keys(o);
	return ks.length === 1 && deepGetKey(o[ks[0]], k);
    }
}

function raw_soap(url, body) {
    var headers = {
	SOAPAction: "",
	"content-type": "text/xml",
    };
    return helpers.post(url, body, { headers: headers }).then(function (result) {
	return parseString(result, { explicitArray: false, ignoreAttrs: true });
    });
}

function soap(templateName, params) {
    var templateFile = __dirname + "/templates/esup-activ-bo/" + templateName;
    return readFile(templateFile).then(function (data) {
	return Mustache.render(data.toString(), params);
    }).then(function (body) {
	//console.log(body);
	return raw_soap(conf.esup_activ_bo.url, body);
    });
}

function get_fault(xml) {
    var fault = deepGetKey(xml, 'soap:Fault');
    return fault && fault.faultstring;
}

// returns a code which allows setPassword
function _validateAccount(uid) {
    var params = { uid: uid };
    return soap("validateAccount.xml", params).then(function (xml) {
	//console.dir(xml, { depth: null });
	var response = deepGetKey(xml, 'ns1:validateAccountResponse');
	var entries = deepGetKey(response, 'entry');
	if (_.isArray(entries)) {
	    var vals = _.zipObject(_.map(entries, 'key'), _.map(entries, 'value'));
	    if (!vals.code) throw "esup_activ_bo.validateAccount did not return code for uid " + uid + ". Account already activated?";
	    return vals.code;
	} else {
	    throw "esup_activ_bo.validateAccount failed: " + (get_fault(xml) || JSON.stringify(xml));
	}
    });
}

// returns a code which allows setPassword
function _setPassword(uid, code, password) {
    var params = { id: uid, code: code, password: password };
    return soap("setPassword.xml", params).then(function (xml) {
	console.dir(xml, { depth: null });
	var response = deepGetKey(xml, 'ns1:setPasswordResponse');
	if (response === '') return; // OK!
	else throw "esup_activ_bo.setPassword failed: " + (get_fault(xml) || JSON.stringify(xml));
    });
}

exports.setPassword = function(uid, password) {
    return _validateAccount(uid).then(function (code) {
	//console.log(code);
	return code && _setPassword(uid, code, password);
    });
};
