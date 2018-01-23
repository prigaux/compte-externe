/// <reference path='types.d.ts' />

import * as _ from 'lodash';
import * as express from 'express';
import * as acl_checker from './acl_checker';
import * as db from './db';
import * as utils from './utils';
import * as search_ldap from './search_ldap';
import * as mail from './mail';
import * as conf from './conf';
import * as conf_steps from './steps/conf';
require('./helpers');

require('promise.prototype.finally').shim();

const router = express.Router();

const bus = utils.eventBus();
const respondJson = utils.respondJson;

function normalize_step(step: step, _name: string) {
    _.each(step.attrs, (opts) => {
        if (opts.toUserOnly) opts.optional = opts.readonly = true;    
    });
}
_.each(conf_steps.steps, normalize_step);

function step(sv: sv): step {
    let r = conf_steps.steps[sv.step];
    if (!r) {
        console.trace("invalid step " + sv.step);
        throw "invalid step " + sv.step;
    }
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
        if (!opt.optional) {
            if (val === '' || val === undefined)
                throw `constraint !${key}.optional failed for ${val}`;
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
        if (opt.choices) {
            const keys = opt.choices.map(e => e.key);
            if (val !== undefined && !keys.includes(val))
                throw `constraint ${key}.choices ${keys} failed for ${val}`;
        }
    });
    return <v> _.assign(prev, v);
}

/* before sending to client, remove sensible information */
function removeHiddenAttrs(attrs: StepAttrsOption, v) {
    return _.omitBy(v, (_val, key) => ( 
        !attrs[key] || attrs[key].hidden
    ));
}
function sv_removeHiddenAttrs(sv: sv): sv {
    sv = _.clone(sv);
    sv.v = removeHiddenAttrs(step(sv).attrs, sv.v) as v;
    return sv;
}

function mayNotifyModerators(req: req, sv: sv, notifyKind: string) {
    let notify = step(sv).notify;
    if (!notify) return;
    acl_checker.moderators(step(sv).acls, sv.v).then(mails => {
        if (!mails.length) { console.log("no moderators"); return }
        //console.log("moderators", mails);
        const sv_url = conf.mainUrl + "/" + sv.step + "/" + sv.id;
        let params = _.merge({ to: mails.join(', '), moderator: req.user, conf, sv_url }, sv);
        mail.sendWithTemplate(notify[notifyKind], params);
    });
}

const acls_allowed_ssubv = (user: CurrentUser) => (
    search_ldap.vuser(user).then(vuser => (
        acl_checker.allowed_ssubvs(vuser, conf_steps.steps)
    ))//.tap(l => console.log(user && user.id, JSON.stringify(l)))
);

function checkAcls(req: req, sv: sv) {
    return acls_allowed_ssubv(req.user).then(allowed_ssubvs => {
        if (acl_checker.is_sv_allowed(sv, allowed_ssubvs)) {
            console.log("authorizing", req.user, "for step", sv.step);
        } else if (!req.user) {
            throw "Unauthorized";
        } else {
            console.error(req.user, "not authorized for step", sv.step);
            throw "Forbidden"
        }
    })
}

function first_sv(req: req, wanted_step: string): Promise<sv> {
    let empty_sv = { step: wanted_step, v: <v> {} };
    if (!step(empty_sv).initialStep) throw `${wanted_step} is not a valid initial step`;
    return action_pre(req, empty_sv);
}

function getRaw(req: req, id: id, wanted_step: string): Promise<sv> {
    let svP;
    if (id === 'new') {
        svP = first_sv(req, wanted_step);
    } else {
        svP = db.get(id).tap(sv => {
            if (!sv) throw "invalid id " + id;
            if (!sv.step) throw "internal error: missing step for id " + id;
            if (wanted_step && sv.step !== wanted_step) {
                console.error("user asked for step " + wanted_step + ", but sv is in state " + sv.step);
                throw "Bad Request";
            }
        });
    }
    return svP.tap(sv => checkAcls(req, sv));
}

function get(req: req, id: id, wanted_step: string) {
    return getRaw(req, id, wanted_step).then(sv_removeHiddenAttrs).then(sv => (
        { ...sv, ...exportStep(step(sv)) }
    ));
}

async function search_with_acls(req: req, wanted_step: string) {
    let token = req.query.token;
    if (!token) return Promise.reject("missing token parameter");
    if (!req.user) return Promise.reject("Unauthorized");
    const sizeLimit = parseInt(req.query.maxRows) || 10;
    const step = conf_steps.steps[wanted_step];

    const vuser = await search_ldap.vuser(req.user);
    const subvs = await acl_checker.allowed_subvs(vuser, step);
    const vs = await search_ldap.searchPeople_matching_subvs(subvs, token, { sizeLimit });
    return _.sortBy(vs, 'displayName').map(v => removeHiddenAttrs(step.attrs, v))
}

function set_new_many(req: req, wanted_step: string, vs: v[]) {
    return Promise.all(vs.map(v => set(req, 'new', wanted_step, v).catch(error => (console.log(error), { error }))));
}

function set(req: req, id: id, wanted_step: string, v: v) {
    return getRaw(req, id, wanted_step).then(sv => (
        setRaw(req, sv, v)
    )).then(svr => {
        let r = <r> { success: true, ...svr.response };
        if (svr.step) {
            r.step = svr.step;
            r.labels = step(svr).labels;
        }
        return r;
    });
}

function advance_sv(req: req, sv: sv) : Promise<svr> {
    if (!sv.id) {
        // do not rely on id auto-created by mongodb on insertion in DB since we need the ID in action_pre for sendValidationEmail
        sv.id = db.new_id();
    }
    return action_post(req, sv).then(svr => {
        const nextStep = step(svr).next;
        svr.step = typeof nextStep === "function" ? nextStep(svr.v) : nextStep;
        if (svr.step) {
            return action_pre(req, svr);
        } else {
            return svr;
        }
    }).then(svr => {
        if (svr.response.autoModerate) {
            // advance again to next step!
            return setRaw(req, svr, svr.v);
        }
        return svr;
    });
}

const checkSetLock = (sv) : Promise<any> => (
    sv.lock ? Promise.reject("locked") : sv.id ? db.setLock(sv.id, true) : Promise.resolve()
);

// 1. merge allow new v attrs into sv
// 2. call action_post
// 3. advance to new step
// 4. call action_pre
// 5. save to DB or remove from DB if one action returned null
function setRaw(req: req, sv: sv, v: v) : Promise<svr> {
    sv.v = mergeAttrs(step(sv).attrs, sv.v, v);
    return checkSetLock(sv).then(_ => (
        advance_sv(req, sv)
    )).tap(svr => {
        let sv = <sv> _.omit(svr, 'response');
        if (sv.step) {
            return saveRaw(req, sv);
        } else {
            return removeRaw(sv.id);
        }
    }).finally(() => db.setLock(sv.id, false))
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

function remove(req: req, id: id, wanted_step: string) {
    return getRaw(req, id, wanted_step).then(sv => {
        // acls are checked => removing is allowed
        mayNotifyModerators(req, sv, 'rejected');
        return removeRaw(sv.id);
    }).then(_ => ({ success: true }));
}

const non_initial_with_acls = (allowed_ssubvs: acl_checker.allowed_ssubvs) => (
    allowed_ssubvs.filter(ssubvs => {
        const step = conf_steps.steps[ssubvs.step];
        return step.acls && !step.initialStep;
    })
)

function listAuthorized(req: req) {
    if (!req.user) return Promise.reject("Unauthorized");
    return search_ldap.vuser(req.user).then(vuser => (
        acl_checker.allowed_ssubvs(vuser, conf_steps.steps)
    )).then(allowed_ssubvs => (
        acl_checker.mongo_query(non_initial_with_acls(allowed_ssubvs))
    )).then(query => (
        db.listByModerator(query)
    )).then(svs => (
        svs.filter(sv => {
            const valid = sv.step in conf_steps.steps;
            if (!valid) console.error("ignoring sv in db with invalid step " + sv.step);
            return valid;
        }).map(sv => (
            { ...sv_removeHiddenAttrs(sv), ...exportStep(step(sv)) }
        ))
    ));
}

const body_to_v = (o) => (
    _.mapValues(o, (val, attr) => {
        let attrType = conf.ldap.people.types[attr];
        return _.isDate(attrType) ? new Date(val) : val;
    }) as v
);

function homonymes(req: req, id: id): Promise<search_ldap.Homonyme[]> {
    return getRaw(req, id, undefined).then(sv => {
        // acls are checked => removing is allowed
        return search_ldap.homonymes(sv.v).then(l => {
                const attrs = { score: {}, ...step(sv).attrs };
                return l.map(v => removeHiddenAttrs(attrs, v) as search_ldap.Homonyme)
            })
    });
}

const exportStep = (step) : Partial<step> => (
    {
        attrs: <StepAttrsOption> _.omitBy(step.attrs, val => val.hidden),
        labels: step.labels,
        attrs_pre: step.attrs_pre,
        allow_many: step.allow_many,
    }
);
const initialSteps = (req: req) => (
  acls_allowed_ssubv(req.user).then(allowed_ssubvs => (
    allowed_ssubvs.filter(({ step }) => (
          conf_steps.steps[step].initialStep
    )).map(({ step, subvs }) => (
        { id: step, 
          acl_subvs: _.isEqual(subvs, [{}]) ? undefined: subvs, // no subvs means no restriction
          ...exportStep(conf_steps.steps[step]),
        }
    ))
  ))
);

router.get('/initialSteps', (req : req, res) => {
    respondJson(req, res, initialSteps(req));
});
    
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

router.get('/comptes/search/:step', (req : req, res) => {
    respondJson(req, res, search_with_acls(req, req.params.step));
});

router.get('/comptes/:id/:step', (req : req, res) => {
    respondJson(req, res, get(req, req.params.id, req.params.step));
});

router.put('/comptes/new_many/:step', (req: req, res) => {
    respondJson(req, res, set_new_many(req, req.params.step, req.body.map(body_to_v)));
});

router.put('/comptes/:id/:step?', (req: req, res) => {
    respondJson(req, res, set(req, req.params.id, req.params.step, body_to_v(req.body)));
});

router.delete('/comptes/:id/:step?', (req: req, res) => {
    respondJson(req, res, remove(req, req.params.id, req.params.step));
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

export default router;
