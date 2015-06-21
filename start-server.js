#!/usr/bin/env node
'use strict';

var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var db = require('./server/db');
var api = require('./server/api');
var utils = require('./server/utils');
var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/app/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({type: '*/*'})); // do not bother checking, everything we will get is JSON :)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'app')));
app.use(utils.express_auth);
app.use('/api', api);

// catch-all that should be replaced with list of angularjs routes
app.all("/*", function(req, res, next) {
    res.sendFile(__dirname + "/app/index.html");
});

db.init(function () {
    var port = process.env.PORT || 8080;        // set our port
    app.listen(port);
    console.log('Started on port ' + port);
});

