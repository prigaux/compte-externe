'use strict';

import * as _ from 'lodash';
import * as util from 'util';
import * as mongodb from 'mongodb';
import * as conf from './conf';
import { renameKey } from './helpers';

function _id(id: string = undefined) {
    return new mongodb.ObjectID(id);
}
function fromDB(sv_: any) {
    return renameKey(sv_, '_id', 'id') as sv;
}
function toDB<T extends { id?: string }>(sv: T) {
    return { ..._.omit(sv, 'id'), _id: _id(sv.id) };
}

let client: mongodb.Db = null;

export const collection = (name: string) => {
    if (!client) throw "db.init not done";
    return client.collection(name);  
}

const svs = () => collection('sv')

export const or = (l: Dictionary<unknown>[]) => l.length === 1 ? l[0] : { $or: l } as Dictionary<unknown>;

export const get = (id: id) => (
    svs().findOne({ _id: _id(id) }).then(fromDB)
);

export const setLock = (id: id, lock: boolean) => (
    svs().updateOne({ _id: _id(id) }, { $set: { lock } })
);

    // lists svs, sorted by steps + recent one at the beginning
export const listByModerator = (query: Object) : Promise<sv[]> => {
        if (_.isEqual(query, { "$or": [] })) return Promise.resolve(null);
        return (
            svs().find(query).sort({ step: 1, modifyTimestamp: -1 }).toArray()
        ).then(svs => (
            _.map(svs, fromDB)
        ));
    };

export const save = <T extends { id?: string }>(sv: T, options = { upsert: true }) => {
            console.log("saving in DB:", util.inspect(sv).replace(/userPassword: '(.*)'/, "userPassword: 'xxx'"));
            let sv_ = { ...toDB(sv), modifyTimestamp: new Date() };
            return svs().replaceOne({ _id: sv_['_id'] }, sv_, options).then(_ => sv);
};

export function init(callback: () => void) {
  mongodb.MongoClient.connect(conf.mongodb.url, (error, client_) => {
      if (error) {
          console.log(error);
          process.exit(1);
      }
      client = client_

      callback();
  });
}

export const new_id = () => (
    "" + _id()
);
