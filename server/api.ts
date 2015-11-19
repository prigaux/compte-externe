/// <reference path='types.d.ts' />

import _ = require('lodash');
import express = require('express');
import acl_checker = require('./acl_checker');
import db = require('./db');
import utils = require('./utils');
import search_ldap = require('./search_ldap');
import mail = require('./mail');
import conf = require('./conf');
import conf_steps = require('./steps/conf');
require('./helpers');

type req = express.Request;

const router = express.Router();

const bus = utils.eventBus();


function step(sv: sv): step {
    return conf_steps.steps[sv.step];
}

function action_pre(req: req, sv: sv) {
    return action(req, sv, 'action_pre');
}
function action_post(req: req, sv: sv) {
    return action(req, sv, 'action_post').tap(sv => {
        mayNotifyModerators(req, sv, 'accepted');
    });
}
function action(req: req, sv: sv, action_name: string): Promise<svr> {
    let f = step(sv)[action_name];
    if (!f) return Promise.resolve(sv); // nothing to do
    //console.log("calling " + action_name + " for step " + sv.step);
    return f(req, sv).then(vr => {
        //console.log("action returned", vr);
        return _.defaults(vr, sv);
    });
}

function mergeAttrs(attrs, prev, v: v) {
    return _.assign(prev, removeHiddenAttrs(attrs, v));
}

function removeHiddenAttrs(attrs: StepAttrsOption, v: v) {
    return _.omit(v, (val, key) => ( 
        !attrs[key] || attrs[key].hidden
    ));
}

function sv_removeHiddenAttrs(sv: sv): sv {
    sv = _.clone(sv);
    sv.v = removeHiddenAttrs(step(sv).attrs, sv.v);
    return sv;
}

function mayNotifyModerators(req: req, sv: sv, notifyKind: string) {
    let notify = step(sv).notify;
    if (!notify) return;
    let mails = sv.moderators;
    if (mails.length) {
        let params = _.merge({ to: mails.join(', '), moderator: req.user, conf: conf }, sv);
        mail.sendWithTemplate(notify[notifyKind], params);
    }
}

function checkAcls(req: req, sv: sv) {
    let ok = acl_checker.isAuthorized(sv.moderators, req.user);
    if (ok) {
        console.log("authorizing", req.user, "for step", sv.step);
    } else {
        throw "unauthorised";
    }
}

function first_sv(req: req): Promise<sv> {
    let step = conf_steps.firstStep(req);
    let empty_sv = { step: step, v: {} };
    return action_pre(req, empty_sv);
}

function getRaw(req: req, id: id): Promise<sv> {
    if (id === 'new') {
        return first_sv(req);
    } else {
        return db.get(id).tap(sv => {
            if (!sv) throw "invalid id " + id;
            if (!sv.step) throw "internal error: missing step for id " + id;
            checkAcls(req, sv);
        });
    }
}

function get(req: req, id: id) {
    return getRaw(req, id).then(sv_removeHiddenAttrs).then(sv => {
        sv.attrs = <StepAttrsOption> _.omit(step(sv).attrs, val => (
            val.hidden
        ));
        return sv;
    });
}

function set(req: req, id: id, v: v) {
    return getRaw(req, id).then(sv => (
        setRaw(req, sv, v)
    ));
}

// 1. merge allow new v attrs into sv
// 2. call action_post
// 3. advance to new step
// 4. call action_pre
// 5. save to DB or remove from DB if one action returned null
function setRaw(req: req, sv: sv, v: v) {
    if (!sv.id) {
        // do not really on id auto-created by mongodb on insertion in DB since we need the ID in action_pre for sendValidationEmail
        sv.id = db.new_id();
    }
    sv.v = mergeAttrs(step(sv).attrs, sv.v, v);
    return action_post(req, sv).then(svr => {
        svr.step = step(svr).next;
        if (svr.step) {
            return action_pre(req, svr);
        } else {
            return svr;
        }
    }).then(svr => {
        if (svr.step) {
            return acl_checker.moderators(step(svr), svr.v).then(mails => {
                svr.moderators = mails;
                return svr;
            });
        } else {
            return svr;
        }
    }).tap(svr => {
        let sv = <sv> _.omit(svr, 'response');
        if (sv.step) {
            return saveRaw(req, sv);
        } else {
            return removeRaw(sv.id);
        }
    }).then(svr => {
        let r = <response> _.assign({success: true}, svr.response);
        if (svr.step) r.step = svr.step;
        return r;
    });
}

function saveRaw(req: req, sv: sv) {
    return db.save(sv).then(sv => {
        bus.emit('changed');
        mayNotifyModerators(req, sv, 'added');
    });
}

function removeRaw(id: id) {
    return db.remove(id).then(() => {
        bus.emit('changed');
    });
}

function remove(req: req, id: id) {
    return getRaw(req, id).then(sv => {
        // acls are checked => removing is allowed
        mayNotifyModerators(req, sv, 'rejected');
        return removeRaw(sv.id);
    });
}

function listAuthorized(req: req) {
    return db.listByModerator(req.user).then(svs => (
        _.map(svs, sv_removeHiddenAttrs)
    ));
}

let _merge_at = (v: v, attrs) => <string[]> _.merge(_.at(v, attrs));

function homonymes(req: req, id: id): Promise<LdapEntry[]> {
    return getRaw(req, id).then(sv => {
        // acls are checked => removing is allowed
        let sns = _merge_at(sv.v, conf.ldap.people.sns);
        let givenNames = _merge_at(sv.v, conf.ldap.people.givenNames);
        if (sns[0] === undefined) return [];
        console.log("sns", sns);
        return search_ldap.homonymes(
            sns,
            givenNames,
            new Date(sv.v.birthDay),
            _.keys(step(sv).attrs));
    });
}

function respondJson(req: req, res: express.Response, p: Promise<response>) {
    let logPrefix = req.method + " " + req.path + ":";
    p.then(r => {
        console.log(logPrefix, r);
        res.json(r || {});
    }, err => {
        console.error(logPrefix, err + err.stack);
        res.json({error: "" + err, stack: err.stack});
    });
}

router.get('/comptes', (req, res) => {
    if (req.query.poll) {
        bus.once('changed', () => {
            respondJson(req, res, listAuthorized(req));
        });
    } else {
        respondJson(req, res, listAuthorized(req));
    }
});

router.get('/comptes/new/:step', (req, res) => {
    respondJson(req, res, get(req, 'new'));
});

router.get('/comptes/:id', (req, res) => {
    respondJson(req, res, get(req, req.params.id));
});

router.put('/comptes/new/:step', (req, res) => {
    respondJson(req, res, set(req, 'new', req.body));
});

router.put('/comptes/:id', (req, res) => {
    respondJson(req, res, set(req, req.params.id, req.body));
});

router.delete('/comptes/:id', (req, res) => {
    respondJson(req, res, remove(req, req.params.id));
});

router.get('/homonymes/:id', (req, res) => {
    respondJson(req, res, homonymes(req, req.params.id));
});

function search_structures(req: req) {
    let token = req.query.token;
    if (!token) throw "missing token parameter";
    let sizeLimit = parseInt(req.query.maxRows) || 10;
    return search_ldap.structures(token, sizeLimit);
}
router.get('/structures', (req, res) => {
    respondJson(req, res, search_structures(req));
});

export = router;
