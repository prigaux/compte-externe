import _ = require('lodash');
import express = require('express');
import path = require('path');
import logger = require('morgan');
import bodyParser = require('body-parser');

import db = require('./db');
import api = require('./api');
import utils = require('./utils');
const app = express();

_.attempt(() => require('source-map-support').install());

const staticFilesOptions = { maxAge: process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 0 };

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get("/", utils.index_html);
app.use(express.static(path.join(__dirname, '../app'), staticFilesOptions));
app.use("/node_modules", express.static(path.join(__dirname, '../node_modules'), staticFilesOptions));
app.use(utils.express_auth);

app.use('/csv2json', 
     bodyParser.text({type: '*/*'}), 
     utils.csv2json);

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

