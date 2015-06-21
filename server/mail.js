'use strict';

var _ = require('lodash');
var fs = require('fs');
var nodemailer = require('nodemailer');
var conf = require('./conf');
var Mustache = require('mustache');

var mailTransporter = nodemailer.createTransport(conf.mail.transport);

// sendMail does not return a promise, it will be done in background. We simply log errors
// params example:
// { from: 'xxx <xxx@xxx>', to: 'foo@bar, xxx@boo', subject: 'xxx', text: '...', html: '...' }
var send = exports.send = function (params) {
    params = _.assign({ from: conf.mail.from }, params);
    if (conf.mail.intercept) {
	params.subject = '[would be sent to ' + params.to + '] ' + params.subject;
	params.to = conf.mail.intercept;
    }
    mailTransporter.sendMail(params, function(error, info){
	if (error) {
            console.log(error);
	} else {
            console.log('Mail sent: ', info);
	}
    });
};

exports.sendWithTemplate = function (templateName, params) {
    console.log("sendWithTemplate");
    fs.readFile(__dirname + "/templates/mail/" + templateName, function (err, data) {
	if (err) {
	    console.log(err);
	} else {
	    var rawMsg = Mustache.render(data.toString(), params);
	    console.log("===========================");
	    console.log("mustache result for", templateName);
	    console.log("with params", params);
	    console.log(rawMsg);
	    console.log("===========================");
	    var m = rawMsg.match(/^Subject: *(.*)\n\n([^]*)/);
	    if (!m) {
		console.error("invalid template " + templateName + ': first line must be "Subject: ..."');
	    } else {
		send({ to: params.to, subject: m[1], html: m[2] });
	    }
	}
    });
};
