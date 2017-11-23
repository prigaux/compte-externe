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

const router = express.Router();

const bus = utils.eventBus();
const respondJson = utils.respondJson;

function normalize_step(step: step, _name: string) {
    _.each(step.attrs, (opts) => {
        if (opts.toUserOnly) opts.readonly = true;    
    });
}
_.each(conf_steps.steps, normalize_step);

function step(sv: sv): step {
    let r = conf_steps.steps[sv.step];
    if (!r) throw "invalid step " + sv.step;
    return r;
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

function mergeAttrs(attrs : StepAttrsOption, prev, v: v): v {
    _.each(attrs, (opt, key) => {
        let val = v[key];
        if (opt.hidden || opt.readonly) {
            /* security: client must NOT modify hidden/readonly information */
            delete v[key];
        }
        if (opt.toUserOnly) {
            /* the attr was sent to the user, but we do not propagate it to next steps (eg: display it to the user, but do not propagate to createCompte step) */
            delete prev[key];
        }
        if (opt.max) {
            if (!(_.isNumber(val) && 0 <= val && val <= opt.max))
                throw `constraint ${key}.max <= ${opt.max} failed for ${val}`;
        }
        if (opt.pattern) {
            let val_ = val !== undefined ? val : '';
            if (!(_.isString(val_) && val_.match("^(" + opt.pattern + ")$")))
                throw `constraint ${key}.pattern ${opt.pattern} failed for ${val}`;
        }
    });
    return <v> _.assign(prev, v);
}

/* before sending to client, remove sensible information */
function removeHiddenAttrs(attrs: StepAttrsOption, v: v): v {
    return <v> _.omitBy(v, (_val, key) => ( 
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
        let params = _.merge({ to: mails.join(', '), moderator: req.user, conf }, sv);
        mail.sendWithTemplate(notify[notifyKind], params);
    }
}

function checkAcls(req: req, sv: sv) {
    return acl_checker.moderators(step(sv).acls, sv.v).then(moderators => {
        // updating moderators
        sv.moderators = moderators;
        return sv;
    }).tap(sv => {
        acl_checker.checkAuthorized(sv.moderators, req.user);
        console.log("authorizing", req.user, "for step", sv.step);
    });
}

function first_sv(req: req): Promise<sv> {
    let step = conf_steps.firstStep(req.params.step, req);
    let empty_sv = { step, v: <v> {} };
    return action_pre(req, empty_sv);
}

function getRaw(req: req, id: id): Promise<sv> {
    let svP;
    if (id === 'new') {
        svP = first_sv(req);
    } else {
        svP = db.get(id).tap(sv => {
            if (!sv) throw "invalid id " + id;
            if (!sv.step) throw "internal error: missing step for id " + id;
        });
    }
    return svP.tap(sv => checkAcls(req, sv));
}

function get(req: req, id: id) {
    return getRaw(req, id).then(sv_removeHiddenAttrs).then(sv => {
        sv.attrs = <StepAttrsOption> _.omitBy(step(sv).attrs, val => (
            val.hidden
        ));
        return sv;
    });
}

function set(req: req, id: id, v: v) {
    return getRaw(req, id).then(sv => (
        setRaw(req, sv, v)
    )).then(svr => {
        let r = <r> { success: true, ...svr.response };
        if (svr.step) r.step = svr.step;
        return r;
    });
}

function advance_sv(req: req, sv: sv) : Promise<svr> {
    return action_post(req, sv).then(svr => {
        const nextStep = step(svr).next;
        svr.step = typeof nextStep === "function" ? nextStep(svr.v) : nextStep;
        if (svr.step) {
            return action_pre(req, svr);
        } else {
            return svr;
        }
    }).then(svr => {
        if (svr.step) {
            return acl_checker.moderators(step(svr).acls, svr.v).then(mails => {
                if (_.includes(mails, "_AUTO_MODERATE_")) {
                  // advance again to next step!
                  return setRaw(req, svr, svr.v);
                }
                if (mails && mails.length === 0) throw "no_moderators";
                svr.moderators = mails;
                return svr;
            });
        } else {
            return svr;
        }
    });
}

// 1. merge allow new v attrs into sv
// 2. call action_post
// 3. advance to new step
// 4. call action_pre
// 5. save to DB or remove from DB if one action returned null
function setRaw(req: req, sv: sv, v: v) : Promise<svr> {
    if (!sv.id) {
        // do not really on id auto-created by mongodb on insertion in DB since we need the ID in action_pre for sendValidationEmail
        sv.id = db.new_id();
    }
    sv.v = mergeAttrs(step(sv).attrs, sv.v, v);
    return advance_sv(req, sv).tap(svr => {
        let sv = <sv> _.omit(svr, 'response');
        if (sv.step) {
            return saveRaw(req, sv);
        } else {
            return removeRaw(sv.id);
        }
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
    }).then(_ => ({ success: true }));
}

function listAuthorized(req: req) {
    if (!req.user) return Promise.reject("Unauthorized");
    return db.listByModerator(req.user).then(svs => (
        _.map(svs, sv_removeHiddenAttrs)
    ));
}

const body_to_v = (o) => (
    _.mapValues(o, (val, attr) => {
        let attrType = conf.ldap.people.types[attr];
        return _.isDate(attrType) ? new Date(val) : val;
    }) as v
);

let _merge_at = (v: v, attrs) => <string[]> _.merge(_.at(<{}> v, attrs));

function homonymes(req: req, id: id): Promise<search_ldap.Homonyme[]> {
    return getRaw(req, id).then(sv => {
        // acls are checked => removing is allowed
        let sns = _merge_at(sv.v, conf.ldap.people.sns);
        let givenNames = _merge_at(sv.v, conf.ldap.people.givenNames);
        if (sns[0] === undefined) return [];
        console.log("sns", sns);
        return search_ldap.homonymes(
            sns,
            givenNames,
            sv.v.birthDay,
            _.keys(step(sv).attrs));
    });
}

router.get('/comptes', (req : req, res) => {
    if (req.query.poll) {
        // raise the limit above what we want
        req.setTimeout(conf.poll_maxTime * 2, _ => res.json({ error: "internal error" }));

        utils.bus_once(bus, 'changed', conf.poll_maxTime).then(() => {
            respondJson(req, res, listAuthorized(req));
        });
    } else {
        respondJson(req, res, listAuthorized(req));
    }
});

router.get('/comptes/new/:step', (req : req, res) => {
    respondJson(req, res, get(req, 'new'));
});

router.get('/comptes/:id', (req : req, res) => {
    respondJson(req, res, get(req, req.params.id));
});

router.put('/comptes/new/:step', (req: req, res) => {
    respondJson(req, res, set(req, 'new', body_to_v(req.body)));
});

router.put('/comptes/:id', (req: req, res) => {
    respondJson(req, res, set(req, req.params.id, body_to_v(req.body)));
});

router.delete('/comptes/:id', (req: req, res) => {
    respondJson(req, res, remove(req, req.params.id));
});

router.get('/homonymes/:id', (req: req, res) => {
    respondJson(req, res, homonymes(req, req.params.id));
});

function search_structures(req: req) {
    let token = req.query.token;
    if (!token) throw "missing token parameter";
    let sizeLimit = parseInt(req.query.maxRows) || 10;
    return search_ldap.structures(token, sizeLimit);
}
router.get('/structures', (req: req, res) => {
    respondJson(req, res, search_structures(req));
});

export = router;
