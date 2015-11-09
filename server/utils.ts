'use strict';

const conf = require('./conf');
const EventEmitter = require('events').EventEmitter;

exports.express_auth = (req, res, next) => {
  let user_id = req.header('REMOTE_USER');
  let mail = req.header('mail');
  if (user_id) req.user = { id: user_id, mail: mail };
  next();
};

exports.index_html = (req, res, next) => {
    let fs = require('fs');
    let Mustache = require('mustache');
    let client_conf = require('../app/conf');
    fs.readFile(__dirname + "/../app/index.html", (err, data) => {
	if (err) {
	    console.log(err);
	} else {
	    data = Mustache.render(data.toString(), client_conf);
	    res.send(data);
	}
    });
};


exports.eventBus = () => {
    let bus = new EventEmitter();
    bus.setMaxListeners(conf.maxLiveModerators);
    return bus;
};


const spawn = require('child_process').spawn;

exports.popen = (inText, cmd, params) => {
    let p = spawn(cmd, params);
    p.stdin.write(inText);
    p.stdin.end();

    return new Promise((resolve, reject) => {
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
};
