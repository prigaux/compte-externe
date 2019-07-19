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
        const cc = (params.cc || '').toString();
        params.subject = '[would be sent to ' + params.to + (cc ? " Cc " + cc : '') + '] ' + params.subject;
        params.to = conf.mail.intercept;
        delete params.cc;
    }
    mailTransporter.sendMail(params, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Mail sent: ', info);
        }
    });
};

export const resolve_mustache_async_params = async (template: string, params: {}) => {
    function tmpl2paths(template) {
        let todo = [...Mustache.parse(template)];
        let r = {};
        while (todo.length) {
            const [kind, path, , , merge_patch_parent_properties] = todo.shift();
            if (kind !== 'text') r[path] = true;
            todo.push(...(merge_patch_parent_properties || []));
        }
        return Object.keys(r);
    }
    let params_ = {};
    await Promise.all(tmpl2paths(template).map(async path => {
        const val = await _.get(params, path);
        if (val) {
            if (typeof val === "object") {
                const val_ = await val.toString();
                _.set(params_, path + ".toString", () => val_);
            } else {
                _.set(params_, path, val);
            }
        }
    }));
    return params_;
}

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
    resolve_mustache_async_params(template, params).then(params_ => {
            let rawMsg = Mustache.render(template, params_);
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
                send({ from: params['from'] || conf.mail.from, to: params['to'], cc: params['cc'], subject: m[1], html: m[2] });
            }
    });
};
