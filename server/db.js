'use strict';

var _ = require('lodash');
var mongodb = require('mongodb');
var conf = require('./conf');

function renameKey(o, oldK, newK) {
    if (o && (oldK in o)) {
	o = _.clone(o);
	var v = o[oldK];
	o[newK] = v;
	delete o[oldK];
    }
    return o;
}

function _id(id) {
    return new mongodb.ObjectID(id);
}
function fromDB(sv_) {
    return renameKey(sv_, '_id', 'id');
}
function toDB(sv) {
    var sv_ = _.omit(sv, 'id');
    sv_._id = _id(sv.id);
    return sv_;
}

function toPromise(f) {
    return new Promise(function (resolve, reject) {
	f(function (err, result) {
	    if (err) {
		reject(err);
	    } else {
		resolve(result);
	    }
	});
    });
}

function init_methods(svs) {

    module.exports.get = function (id) {
	return toPromise(function (onResult) {
	    svs.findOne({ _id: _id(id) }, onResult);
	}).then(fromDB);
    };

    module.exports.listBySteps = function (steps) {
	return toPromise(function (onResult) {
	    svs.find({ step: { $in: steps } }).toArray(onResult);
	}).then(function (svs) {
	    return _.map(svs, fromDB);
	});
    };

    module.exports.remove = function (id) {
	return toPromise(function (onResult) {
	    svs.remove({ _id: _id(id) }, onResult);
	});
    };

    module.exports.save = function (sv) {
	return toPromise(function (onResult) {
	    console.log("saving in DB:", sv);
	    var sv_ = toDB(sv);
	    svs.updateOne({ _id: sv_._id }, sv_, {upsert: true}, onResult);
	}).then(function (result) {
	    return sv;
	});
    };

}

module.exports.init = function (callback) {
  mongodb.MongoClient.connect(conf.mongodb.url, function(error, client) {
      if (error) {
	  console.log(error);
	  process.exit(1);
      }
      init_methods(client.collection('sv'));

      callback();
  });
};

module.exports.new_id = function () {
    return "" + _id();
};

var mongodb = require('mongodb');
