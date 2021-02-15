import * as _ from 'lodash';
import * as express from 'express';
import * as path from 'path';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';

import * as db from './db';
import api from './api';
import * as utils from './utils';
import * as cas from './cas';
import * as conf from './conf';
import * as conf_steps from './steps/conf';
const app = express();

_.attempt(() => require('source-map-support').install());

const staticFilesOptions = { maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 0 };
const json_limit = '10MB'; // must be kept lower than 16MB for cases when it is stored in mongodb. NB: syntax is https://www.npmjs.com/package/bytes
const csv_limit = '1MB';

app.set('query parser', 'simple')

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use("/", express.static(path.join(__dirname, '../app/dist'), staticFilesOptions));
if (conf.cas.host) {
    cas.init(app);
} else {
    app.use(utils.shibboleth_express_auth);
}

const express_if_then_else = (cond, if_true, if_false) => (
    (req: req, res: res, next) => {
        (cond(req) ? if_true : if_false)(req, res, next);
    }
);

// NB: we could rely on Content-Type, but it is easy enough to rely on request path (since we mostly do JSON, except some very special cases)
const myBodyParser = express_if_then_else(
    (req) => req.path === '/csv2json', 
    bodyParser.raw({type: '*/*', limit: csv_limit }),
    bodyParser.json({type: '*/*', limit: json_limit }),
);

// needed for XHRs on MSIE
const force_noCache = (_req: req, res: res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store');
    next();
}

app.use('/api', myBodyParser, force_noCache, api);

// handle main Vue html page.
// list valid urls (as already done in app/src/router.ts) 
// (NB: we could use a catchall, but it is better to get 404 errors)
app.use([ "login", "steps", ...Object.keys(conf_steps.steps) ].map(path => "/" + path), utils.index_html);

db.init(() => {
    let port = process.env.PORT || 8080;        // set our port
    app.listen(port);
    console.log('Started on port ' + port);
});

