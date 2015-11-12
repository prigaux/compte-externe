import express = require('express');
import path = require('path');
import logger = require('morgan');
import bodyParser = require('body-parser');

import db = require('./db');
import api = require('./api');
import utils = require('./utils');
const app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({type: '*/*'})); // do not bother checking, everything we will get is JSON :)
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", utils.index_html);
app.use(express.static(path.join(__dirname, '../app'),
		      { maxAge: process.env.NODE_ENV == 'production' ? 60 * 60 * 1000 : 0 }));
app.use(utils.express_auth);
app.use('/api', api);

// catch-all that should be replaced with list of angularjs routes
app.all("/*", utils.index_html);

db.init(() => {
    let port = process.env.PORT || 8080;        // set our port
    app.listen(port);
    console.log('Started on port ' + port);
});

