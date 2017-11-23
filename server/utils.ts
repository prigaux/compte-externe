'use strict';

import _ = require('lodash');
import express = require('express');
import conf = require('./conf');
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
        res.status(err === "Unauthorized" ? 401 : err === "Forbidden" ? 403 : 500);
        res.json({error: "" + err, stack: err.stack});
    });
}

export const index_html = (_req: req, res: express.Response, _next): void => {
    let fs = require('fs');
    let Mustache = require('mustache');
    let client_conf = require('../app/conf');    
    let tconf = _.merge({ livereload: process.env.NODE_ENV !== 'production', mainUrl: conf.mainUrl }, client_conf);
    fs.readFile(__dirname + "/../app/index.html", (err, data) => {
        if (err) {
            console.log(err);
        } else {
            data = Mustache.render(data.toString(), tconf);
            res.send(data);
        }
    });
};


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
