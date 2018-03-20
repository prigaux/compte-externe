'use strict';

import * as _ from 'lodash';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import * as conf from './conf';
import * as Mustache from 'mustache';

const mailTransporter = nodemailer.createTransport(conf.mail.transport);

// sendMail does not return a promise, it will be done in background. We simply log errors
// params example:
// { from: 'xxx <xxx@xxx>', to: 'foo@bar, xxx@boo', subject: 'xxx', text: '...', html: '...' }
export const send = (params: nodemailer.SendMailOptions) => {
    params = _.assign({ from: conf.mail.from }, params);
    if (conf.mail.intercept) {
        params.subject = '[would be sent to ' + params.to + '] ' + params.subject;
        params.to = conf.mail.intercept;
    }
    mailTransporter.sendMail(params, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Mail sent: ', info);
        }
    });
};

export const sendWithTemplateFile = (templateName: string, params: {}) => {
    fs.readFile(__dirname + "/templates/mail/" + templateName, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            sendWithTemplate(data.toString(), params, templateName);
        }
    });
}
export const sendWithTemplate = (template: string, params: {}, templateName = "") => {
            let rawMsg = Mustache.render(template, params);
            if (!rawMsg) return;
            console.log("===========================");
            console.log("mustache result for", templateName);
            //console.log("with params", params);
            console.log(rawMsg);
            console.log("===========================");
            let m = rawMsg.match(/^Subject: *(.*)\n\n([^]*)/);
            if (!m) {
                console.error("invalid template " + (templateName || template) + ': first line must be "Subject: ..."');
            } else {
                send({ to: params['to'], subject: m[1], html: m[2] });
            }
};
