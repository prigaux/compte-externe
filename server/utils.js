'use strict';

var conf = require('./conf');
var EventEmitter = require('events').EventEmitter;

exports.express_auth = function (req, res, next) {
  var user_id = req.header('REMOTE_USER');
  if (user_id) req.user = { id: user_id };
  next();
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
