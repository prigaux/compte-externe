import * as _ from 'lodash';
import * as express from 'express';
import * as path from 'path';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';

import * as db from './db';
import gen_gsh_script from './gen_gsh_script';
import api from './api';
import * as utils from './utils';
const app = express();

_.attempt(() => require('source-map-support').install());

const staticFilesOptions = { maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 0 };

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get("/", utils.index_html);
app.use("/static", express.static(path.join(__dirname, '../app/dist/static'), staticFilesOptions));
app.use(utils.express_auth);

app.use('/csv2json', 
     bodyParser.text({type: '*/*'}), 
     utils.csv2json);

app.use('/gen_gsh_script', gen_gsh_script);

app.use('/api',
     bodyParser.json({type: '*/*'}), // do not bother checking, everything we will get is JSON :)
     bodyParser.urlencoded({ extended: false }),
     api);

// catch-all that should be replaced with list of angularjs routes
app.all("/*", utils.index_html);

db.init(() => {
    let port = process.env.PORT || 8080;        // set our port
    app.listen(port);
    console.log('Started on port ' + port);
});

