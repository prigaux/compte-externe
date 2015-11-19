'use strict';

import _ = require('lodash');
import express = require('express');
import conf = require('./conf');
import { EventEmitter } from 'events';

export const express_auth = (req: express.Request, res: express.Response, next): void => {
  let user_id = req.header('REMOTE_USER');
  let mail = req.header('mail');
  if (user_id) req.user = { id: user_id, mail };
  next();
};

export const index_html = (req: express.Request, res: express.Response, next): void => {
    let fs = require('fs');
    let Mustache = require('mustache');
    let client_conf = require('../app/conf');    
    let conf = _.merge({ livereload: process.env.NODE_ENV !== 'production' }, client_conf);
    fs.readFile(__dirname + "/../app/index.html", (err, data) => {
        if (err) {
            console.log(err);
        } else {
            data = Mustache.render(data.toString(), conf);
            res.send(data);
        }
    });
};


export const eventBus = (): EventEmitter => {
    let bus = new EventEmitter();
    bus.setMaxListeners(conf.maxLiveModerators);
    return bus;
};


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
