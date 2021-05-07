'use strict';

import * as path from 'path';
import * as _ from 'lodash';
import * as iconv from 'iconv-lite';
import * as express from 'express';
import * as csvtojson from 'csvtojson';
import * as session from 'express-session';
import * as session_file_store from 'session-file-store';
import concat = require('concat-stream');
import * as simpleGet from 'simple-get';
import * as http from 'http';
import * as conf from './conf';
import shared_conf from '../shared/conf';
import { EventEmitter } from 'events';

export const shibboleth_express_auth : express.RequestHandler<any, unknown, unknown, unknown> = (req, _res, next): void => {
  let user_id = req.header('REMOTE_USER');
  if (user_id) req.user = { id: user_id };
  next();
};

export function session_store() {
    const FileStore = session_file_store(session);
    return session({
        store: new FileStore({ retries: 0, ...conf.session_store }), 
        resave: false, saveUninitialized: false,
        ...conf.session,
    });
}

export const query_string = (qs: Dictionary<string>) => {
    const params = "" + new URLSearchParams(qs)
    return params ? "?" + params : ""
}

interface http_client_Options {
    headers? : {};
    timeout?: number;
    method?: 'GET' | 'POST'
}

export const http_request = (url: string, options: http_client_Options & { body?: string }) : Promise<string> => {
    options = _.assign({ url, ca: conf.http_client_CAs }, options);
    return new Promise((resolve: (_: string) => void, reject: (_: any) => void) => {
        simpleGet(options, (err: any, res: http.IncomingMessage) => {
            if (err) return reject(err);
            res.setTimeout(options.timeout || 10000, null);

            //console.log(res.headers)

            res.pipe(concat(data => {
                //console.log('got the response: ' + data)
                if (res.statusCode !== 200) 
                    reject({ error: data.toString(), statusCode: res.statusCode });
                else
                    resolve(data.toString());
            }));
        });
    });
};

export const post = (url: string, body: string, options: Omit<http_client_Options, 'method'>) : Promise<string> => {
    return http_request(url, { method: 'POST', body, ...options })
};

const http_statuses: Dictionary<number> = {
    "Bad Request": 400,
    "Unauthorized": 401,
    "Forbidden": 403,
    "OK": 200,
}

export function respondJson(req: req, res: express.Response, p: Promise<response>) {
    let logPrefix = req.method + " " + req.path + ":";
    p.then(r => {
        //console.log(logPrefix, r);
        res.json(r);
    }, err => {
        console.error(logPrefix, err);
        const errMsg = err.code || "" + err;
        res.status(http_statuses[errMsg] || 500);
        res.json(err.code ? err : {error: errMsg, stack: err.stack});
    });
}

export const index_html = (_req: req, res: express.Response, _next: next): void => {
    res.sendFile(path.join(__dirname, "../app/dist/index.html"), err => { 
        if (err) console.error(err)
    })
};


const toString = (buffer : Buffer) => {
    let r = buffer.toString('utf8');
    if (r.match("\uFFFD")) r = iconv.decode(buffer, 'win1252'); // fallback
    return r;
}

const parse_csv = (csv: string): Promise<{ fields: string[], lines: {}[] }> => (
    new Promise((resolve, reject) => {
        const convert = csvtojson({ 
            delimiter: "auto", // relies on the delimiter most present in headers. Since field names should not contain any known delimiters (,|\t;:), it is ok!
            checkColumn: true,
        });      
        let fields: string[];
        convert.fromString(csv)
          .on('header', (header: string[]) => fields = header)
          .on('end_parsed', (lines: {}[]) => resolve({ fields, lines }))
          .on('error', (err: any) => {
            console.log("parse_csv failed on\n", csv);
            reject(err);
        });
    })
);
export const csv2json = (req: req, res: res): void => (
    respondJson(req, res, parse_csv(toString(req.body)))
);

export const eventBus = (): EventEmitter => {
    let bus = new EventEmitter();
    bus.setMaxListeners(conf.maxLiveModerators);
    return bus;
};

export const bus_once = (bus: EventEmitter, _event: string, maxTime: number) => (
    Promise.race([ wait(maxTime), 
                   new Promise(resolve => bus.once('changed', resolve)) ])
);

export const wait = (milliseconds: number) => (
    new Promise(resolve => setTimeout(resolve, milliseconds))
);


import { spawn } from 'child_process';

export function popen(inText: string, cmd: string, params: string[]): Promise<string> {
    let p = spawn(cmd, params);
    p.stdin.write(inText);
    p.stdin.end();

    return <Promise<string>> new Promise((resolve, reject) => {
        let output = '';
        let get_ouput = (data: any) => { output += data; };
        
        p.stdout.on('data', get_ouput);
        p.stderr.on('data', get_ouput);
        p.on('error', event => {
            reject(event);
        });
        p.on('close', code => {
            if (code === 0) resolve(output); else reject(output);
        });
    });
}

export function mergeSteps(initialSteps: steps, nextSteps: steps): steps {
    _.forEach(initialSteps, (step, _name) => step.initialStep = true);
    return { ...initialSteps, ...nextSteps };
}

export const attrsHelpingDiagnoseHomonymes = (
    { 
        global_main_profile: { 
            toUser(_: any, v: v) {
                return v.uid && { description: ` est ${shared_conf.affiliation_labels[v.global_eduPersonPrimaryAffiliation] || 'un ancien compte sans affiliation'}` }
            },
            toUserOnly: true, 
            uiHidden: true,
        },
    }
);

export const mapAttrs = <T>(attrs: StepAttrsOptionT<T>, f: (opts: StepAttrOptionT<T>, attrName: string) => StepAttrOptionT<T>) => (
    _.mapValues(attrs, (opts, key) => {
        opts = f(opts, key);
        if (opts.properties) opts.properties = mapAttrs(opts.properties, f);
        const rec_mpp = <M extends Mpp<T>>(mpp: M) => (
            mpp.merge_patch_parent_properties ? { ...mpp, merge_patch_parent_properties: mapAttrs(mpp.merge_patch_parent_properties, f) } : mpp
        )
        if (opts.then) opts.then = rec_mpp(opts.then)
        if (opts.oneOf) opts.oneOf = opts.oneOf.map(rec_mpp)
        return opts;        
    })
)

export const forceAttrs = (attrs: StepAttrsOption, attrsToForce: Dictionary<any>) => (
    mapAttrs(attrs, (opts) => ({ ...opts, ...attrsToForce }))
)

export const deep_extend = <T extends Dictionary<any>, U extends Dictionary<any>>(o: T, overrides: U) => {
    if (_.isPlainObject(o) && _.isPlainObject(overrides)) {
        const r: T & U = { ...o, ...overrides };
        for (const attr of _.intersection(Object.keys(o), Object.keys(overrides))) {
            // @ts-expect-error
            r[attr] = deep_extend(o[attr], overrides[attr]);
        }
        return r;
    } else {
        return overrides;
    }
}

export const findStepAttr = (attrs: StepAttrsOption, f: (opts: StepAttrOption, key: string) => boolean): { key: string, opts: StepAttrOption } => {
    for (const key in attrs) {
        const opts = attrs[key];

        if (f(opts, key)) return { key, opts };

        if (opts.properties) {
            const r = findStepAttr(opts.properties, f);
            if (r) return r;
        }
        if (opts.then?.merge_patch_parent_properties) {
            const r = findStepAttr(opts.then.merge_patch_parent_properties, f);
            if (r) return r;
        }
        if (opts.oneOf) {
            for (const choice of opts.oneOf) {
                if (choice.merge_patch_parent_properties) {
                    const r = findStepAttr(choice.merge_patch_parent_properties, f);
                    if (r) return r;
                }
            }
        }
    }
    return undefined;
}
