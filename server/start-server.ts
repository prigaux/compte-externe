import * as _ from 'lodash';
import * as express from 'express';
import * as path from 'path';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';

import * as db from './db';
import api from './api';
import * as utils from './utils';
import * as conf_steps from './steps/conf';
const app = express();

_.attempt(() => require('source-map-support').install());

const staticFilesOptions = { maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 0 };
const json_limit = '10MB'; // must be kept lower than 16MB for cases when it is stored in mongodb. NB: syntax is https://www.npmjs.com/package/bytes

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use("/", express.static(path.join(__dirname, '../app/dist'), staticFilesOptions));
app.use(utils.express_auth);

app.use('/api',
     bodyParser.json({type: '*/*', limit: json_limit }), // do not bother checking, everything we will get is JSON :)
     bodyParser.urlencoded({ extended: false }),
     api);

// redo what app/src/router.ts is doing
app.use([ "login", "steps", ...Object.keys(conf_steps.steps) ].map(path => "/" + path), utils.index_html);

db.init(() => {
    let port = process.env.PORT || 8080;        // set our port
    app.listen(port);
    console.log('Started on port ' + port);
});

