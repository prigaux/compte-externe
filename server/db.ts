'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import * as mongodb from 'mongodb';
import * as conf from './conf';

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
function fromDB(sv_): sv {
    return renameKey(sv_, '_id', 'id');
}
function toDB(sv: sv) {
    let sv_ = _.omit(sv, 'id');
    sv_['_id'] = _id(sv.id);
    return sv_;
}

let real_svs: mongodb.Collection = null;

function svs() {
  if (!real_svs) throw "db.init not done";
  return real_svs;
}

export const or = (l: Dictionary<any>[]) => l.length === 1 ? l[0] : { $or: l } as Dictionary<any>;

export const get = (id: id) => (
    svs().findOne({ _id: _id(id) }).then(fromDB)
);

export const setLock = (id: id, lock: boolean) => (
    svs().updateOne({ _id: _id(id) }, { $set: { lock } })
);

    // lists svs, sorted by steps + recent one at the beginning
export const listByModerator = (query) : Promise<sv[]> => {
        if (_.isEqual(query, { "$or": [] })) return Promise.resolve(null);
        return (
            svs().find(query).sort({ step: 1, modifyTimestamp: -1 }).toArray()
        ).then(svs => (
            _.map(svs, fromDB)
        ));
    };

export const remove = (id: id) => (
    svs().remove({ _id: _id(id) })
);

export const save = (sv: sv) => {
            console.log("saving in DB:", util.inspect(sv).replace(/userPassword: '(.*)'/, "userPassword: 'xxx'"));
            let sv_ = toDB(sv);
            sv_['modifyTimestamp'] = new Date();
            return svs().replaceOne({ _id: sv_['_id'] }, sv_, {upsert: true}).then(_ => sv);
};

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
