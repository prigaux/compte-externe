'use strict';

var _ = require('lodash');
var concat = require('concat-stream');
var simpleGet = require('simple-get');
var conf = require('./conf');

if (Promise.prototype.tap === undefined) {
    Promise.prototype.tap = function (f) {
	return this.then(function (v) {
	    var p = f(v);
	    if (!p || !p.then) p = Promise.resolve(p);
	    return p.then(function () { return v; });
	});
    };
}

exports.post = function (url, body, options) {
    options = _.assign({ url: url, body: body, ca: conf.http_client_CAs }, options);
    return new Promise(function (resolve, reject) {
	simpleGet.post(options, function (err, res) {
	    if (err) return reject(err);
	    res.setTimeout(options.timeout || 10000);

	    //console.log(res.headers)

	    res.pipe(concat(function (data) {
		//console.log('got the response: ' + data)
		resolve(data.toString());
	    }));
	});
    });
};

exports.promisify_callback = function (f) {
    return function (args) {
	args = Array.prototype.slice.call(arguments, 0);
	return new Promise(function (resolve, reject) {
	    function callback(err, result) {
		if (err) reject(err); else resolve(result);
	    }
	    f.apply(null, args.concat(callback));
	});
    };
};
