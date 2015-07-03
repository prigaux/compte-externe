'use strict';

var conf = require('./conf');
var EventEmitter = require('events').EventEmitter;

exports.express_auth = function (req, res, next) {
  var user_id = req.header('REMOTE_USER');
  if (user_id) req.user = { id: user_id };
  next();
};

exports.index_html = function (req, res, next) {
    var fs = require('fs');
    var Mustache = require('mustache');
    var client_conf = require('../app/conf');
    fs.readFile(__dirname + "/../app/index.html", function (err, data) {
	if (err) {
	    console.log(err);
	} else {
	    data = Mustache.render(data.toString(), client_conf);
	    res.send(data);
	}
    });
};


exports.eventBus = function () {
    var bus = new EventEmitter();
    bus.setMaxListeners(conf.maxLiveModerators);
    return bus;
};


var spawn = require('child_process').spawn;

exports.popen = function(inText, cmd, params) {
    var p = spawn(cmd, params);
    p.stdin.write(inText);
    p.stdin.end();

    return new Promise(function (resolve, reject) {
	var output = '';
	var get_ouput = function (data) { output += data; };
	
	p.stdout.on('data', get_ouput);
	p.stderr.on('data', get_ouput);
	p.on('error', function (event) {
	    reject(event);
	});
	p.on('close', function (code) {
	    if (code === 0) resolve(output); else reject(output);
	});
    });
};
