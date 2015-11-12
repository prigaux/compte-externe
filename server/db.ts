'use strict';

import _ = require('lodash');
import mongodb = require('mongodb');
import conf = require('./conf');

function renameKey(o, oldK, newK) {
    if (o && (oldK in o)) {
	o = _.clone(o);
	let v = o[oldK];
	o[newK] = v;
	delete o[oldK];
    }
    return o;
}

function _id(id: string = undefined) {
    return new mongodb.ObjectID(id);
}
function fromDB(sv_) {
    return renameKey(sv_, '_id', 'id');
}
function toDB(sv: sv) {
    let sv_ = _.omit(sv, 'id');
    sv_['_id'] = _id(sv.id);
    return sv_;
}

function toPromise(f) {
    return new Promise((resolve, reject) => {
	f((err, result) => {
	    if (err) {
		reject(err);
	    } else {
		resolve(result);
	    }
	});
    });
}

let real_svs = null;

function svs() {
  if (!real_svs) throw "db.init not done";
  return real_svs;
}

export const get = id => (
	toPromise(onResult => {
	    svs().findOne({ _id: _id(id) }, onResult);
	}).then(fromDB)
    );

    // lists svs, sorted by steps + recent one at the beginning
export const listByModerator = user => {
	let mail = user.mail;
	return toPromise(onResult => {
	    svs().find({ moderators: mail }).sort({ step: 1, modifyTimestamp: -1 }).toArray(onResult);
	}).then(svs => (
	    _.map(svs, fromDB)
	));
    };

export const remove = id => (
	toPromise(onResult => {
	    svs().remove({ _id: _id(id) }, onResult);
	})
    );

export const save = sv => (
	toPromise(onResult => {
	    console.log("saving in DB:", sv);
	    let sv_ = toDB(sv);
	    sv_['modifyTimestamp'] = new Date();
	    svs().updateOne({ _id: sv_['_id'] }, sv_, {upsert: true}, onResult);
	}).then((_result) => (
	    sv
	))
    );

export function init(callback) {
  mongodb.MongoClient.connect(conf.mongodb.url, (error, client) => {
      if (error) {
	  console.log(error);
	  process.exit(1);
      }
      real_svs = client.collection('sv');

      callback();
  });
}

export const new_id = () => (
    "" + _id()
);
