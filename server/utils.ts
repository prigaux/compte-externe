'use strict';

import * as path from 'path';
import * as _ from 'lodash';
import * as express from 'express';
import * as csvtojson from 'csvtojson';
import * as conf from './conf';
import client_conf from '../app/conf'; // ES6 syntax needed for default export
import { EventEmitter } from 'events';

export const express_auth = (req: req, _res: express.Response, next): void => {
  let user_id = req.header('REMOTE_USER');
  let mail = req.header('mail');
  if (user_id) req.user = { id: user_id, mail };
  next();
};

export function respondJson(req: req, res: express.Response, p: Promise<response>) {
    let logPrefix = req.method + " " + req.path + ":";
    p.then(r => {
        //console.log(logPrefix, r);
        res.json(r || {});
    }, err => {
        console.error(logPrefix, err + err.stack);
        res.status(err === "Unauthorized" ? 401 : err === "Forbidden" ? 403 : err === "Bad Request" ? 400 : 500);
        res.json({error: "" + err, stack: err.stack});
    });
}

if (!client_conf.base_pathname.match(/\/$/)) throw "base_pathname in app/conf.ts must have a trailing slash";

export const index_html = (_req: req, res: express.Response, _next): void => {
    res.sendFile(path.join(__dirname, "../app/dist/index.html"), console.error)
};



const parse_csv = (csv: string): Promise<{ fields: string[], lines: {}[] }> => (
    new Promise((resolve, reject) => {
        const convert = csvtojson({ 
            delimiter: "auto", // relies on the delimiter most present in headers. Since field names should not contain any known delimiters (,|\t;:), it is ok!
            checkColumn: true,
        });      
        let fields;
        convert.fromString(csv)
          .on('header', header => fields = header)
          .on('end_parsed', lines => resolve({ fields, lines }))
          .on('error', err => {
            console.log("parse_csv failed on\n", csv);
            reject(err);
        });
    })
);
export const csv2json = (req: req, res): void => (
    respondJson(req, res, parse_csv(req.body))
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
        let get_ouput = data => { output += data; };
        
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

export const addDays = (date : Date, days : number) => {
    let r = date;
    r.setDate(r.getDate() + days);
    return r;
}

export const nextDate = (pattern : string, date: Date) => {
    let s = pattern.replace(/^XXXX-/, "" + date.getFullYear() + "-");
    let r = new Date(s);
    if (r.getTime() < date.getTime()) r.setFullYear(r.getFullYear() + 1);
    return r;
}

export const equalsIgnoreCase = (a: string, b: string) => (
    a.toLowerCase() === b.toLowerCase()
)

export function mergeSteps(initialSteps: steps, nextSteps: steps): steps {
    _.forEach(initialSteps, (step, _name) => step.initialStep = true);
    return { ...initialSteps, ...nextSteps };
}
