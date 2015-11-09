'use strict';

import _ = require('lodash');
import assert = require('assert');
import concat = require('concat-stream');
import simpleGet = require('simple-get');
import conf = require('./conf');

if (Promise.prototype.tap === undefined) {
    Promise.prototype.tap = function (f) {
	return this.then(v => {
	    let p = f(v);
	    if (!p || !p.then) p = Promise.resolve(p);
	    return p.then(() => v);
	});
    };
}

export const post = (url, body, options) => {
    options = _.assign({ url: url, body: body, ca: conf.http_client_CAs }, options);
    return new Promise((resolve, reject) => {
	simpleGet.post(options, (err, res) => {
	    if (err) return reject(err);
	    res.setTimeout(options.timeout || 10000, null);

	    //console.log(res.headers)

	    res.pipe(concat(data => {
		//console.log('got the response: ' + data)
		resolve(data.toString());
	    }));
	});
    });
};

export const promisify_callback = f => (
    args => {
	args = Array.prototype.slice.call(arguments, 0);
	return new Promise((resolve, reject) => {
	    function callback(err, result) {
		if (err) reject(err); else resolve(result);
	    }
	    f.apply(null, args.concat(callback));
	});
    }
);
