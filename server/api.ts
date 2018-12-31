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
import { export_v, merge_v, exportAttrs, selectUserProfile } from './step_attrs_option';
import { filters } from './ldap';
require('./helpers');

require('promise.prototype.finally').shim();

const router = express.Router();

const bus = utils.eventBus();
const respondJson = utils.respondJson;

function step(sv: sv): step {
    let r = conf_steps.steps[sv.step];
    if (!r) {
        console.trace("invalid step " + sv.step);
        throw "invalid step " + sv.step;
    }
    return r;
}

function add_step_attrs<SV extends sv>(sv: SV) {
    const attrs = step(sv).attrs;
    let sva = sv as SV & { attrs: StepAttrsOption };
    sva.attrs = typeof attrs === "function" ? attrs(sv.v) : attrs;
    return sva;
}

const sv_attrs = (sv: sva) => sv.attrs; 

function action_pre(req: req, sv: sv): Promise<svr> {
    return action(req, sv, 'action_pre');
}
function action_post(req: req, sv: sva): Promise<svra> {
    return action(req, sv, 'action_post').tap(sv => {
        const accountStatus = sv.response && sv.response.accountStatus;
        if (accountStatus && accountStatus !== 'active') {
            notifyModerators(req, sv, 'weird_account_status.html');
        }
        mayNotifyModerators(req, sv, 'accepted');
    });
}
function action(req: req, sv: sv|sva, action_name: string) {
    let f = step(sv)[action_name];
    if (!f) return Promise.resolve(sv); // nothing to do
    //console.log("calling " + action_name + " for step " + sv.step);
    return f(req, sv).then(vr => {
        //console.log("action returned", vr);
        return _.defaults(vr, sv);
    });
}

async function may_export_v_ldap(sv: sva) {
    if (sv.v && sv.v.uid) {
        let v_ldap = await search_ldap.onePerson(filters.eq("uid", sv.v.uid));
        if (sv.v.profilename) v_ldap = selectUserProfile(v_ldap, sv.v.profilename)
        v_ldap = export_v(sv_attrs(sv), v_ldap) as v;
        return { ...sv, v_ldap };
    }
    return sv;
}

function export_sv(sv: sva) {
    sv = _.clone(sv);
    sv.v = export_v(sv_attrs(sv), sv.v) as v;
    sv.attrs = exportAttrs(sv.attrs);
    return { ...sv, ...exportStep(step(sv)) };
}

function mayNotifyModerators(req: req, sv: sv, notifyKind: string) {
    let notify = step(sv).notify;
    if (notify) notifyModerators(req, sv, notify[notifyKind]);
}
function notifyModerators(req: req, sv: sv, templateName: string) {
    acl_checker.moderators(step(sv).acls, sv.v).then(mails => {
        if (!mails.length) { console.log("no moderators"); return }
        //console.log("moderators", mails);
        const sv_url = conf.mainUrl + "/" + sv.step + "/" + sv.id;
        let params = _.merge({ to: mails.join(', '), moderator: req.user, conf, sv_url }, sv);
        mail.sendWithTemplateFile(templateName, params);
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
            const ssubv = allowed_ssubvs.find(ssubv => ssubv.step === sv.step);
            console.error(req.user, "not authorized for step", sv.step, ssubv && ssubv.subvs, sv.v);
            throw "Forbidden"
        }
    })
}

function first_sv(req: req, wanted_step: string): Promise<sv> {
    let empty_sv = { step: wanted_step, v: <v> {} };
    if (!step(empty_sv).initialStep) throw `${wanted_step} is not a valid initial step`;
    return action_pre(req, empty_sv);
}

async function getRaw(req: req, id: id, wanted_step: string): Promise<sva> {
    let sv: sv;

    if (id === 'new') {
        sv = await first_sv(req, wanted_step);
    } else {
        sv = await db.get(id);
        if (!sv) throw "invalid id " + id;
        if (!sv.step) throw "internal error: missing step for id " + id;
        if (wanted_step && sv.step !== wanted_step) {
            console.error("user asked for step " + wanted_step + ", but sv is in state " + sv.step);
            throw "Bad Request";
        }
    }
    await checkAcls(req, sv);
    return add_step_attrs(sv);
}

function get(req: req, id: id, wanted_step: string) {
    return getRaw(req, id, wanted_step).then(may_export_v_ldap).then(export_sv);
    // TODO add potential_homonyms si id !== 'new' && attrs && attrs.uid
}

async function search_with_acls(req: req, wanted_step: string) {
    let token = req.query.token;
    if (!token) return Promise.reject("missing token parameter");
    if (!req.user) return Promise.reject("Unauthorized");
    const sizeLimit = parseInt(req.query.maxRows) || 10;
    const step = conf_steps.steps[wanted_step];

    const vuser = await search_ldap.vuser(req.user);
    const subvs = await acl_checker.allowed_subvs(vuser, step);
    const attrTypes = _.pick(conf.ldap.people.types, ['sn', 'givenName', 'uid', 'global_profilename']);
    const vs = await search_ldap.searchPeople_matching_subvs(subvs, token, attrTypes, { sizeLimit });
    return _.sortBy(vs, 'displayName')
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

function advance_sv(req: req, sv: sva) : Promise<svr> {
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
        const svra = svr.step ? add_step_attrs(svr) : svr as svra;
        if (svr.response && svr.response.autoModerate) {
            // advance again to next step!
            return setRaw(req, svra, svr.v);
        }
        return svra;
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
function setRaw(req: req, sv: sva, v: v) : Promise<svr> {
    sv.v = merge_v(sv_attrs(sv), sv.v, v);
    return checkSetLock(sv).then(_ => (
        advance_sv(req, sv)
    )).tap(svr => {
        let sv = <sv> _.omit(svr, 'response', 'attrs');
        if (sv.v.various) delete sv.v.various.diff;
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
        svs && svs.filter(sv => {
            const valid = sv.step in conf_steps.steps;
            if (!valid) console.error("ignoring sv in db with invalid step " + sv.step);
            return valid;
        }).map(add_step_attrs).map(export_sv)
    ));
}

const body_to_v = (o) => (
    _.mapValues(o, (val, attr) => {
        let attrType = conf.ldap.people.types[attr];
        return _.isDate(attrType) ? new Date(val) : 
          _.isNumber(attrType) && val ? parseFloat(val) :
          val;
    }) as v
);

function homonymes(req: req, id: id, v: v): Promise<search_ldap.Homonyme[]> {
    return getRaw(req, id, undefined).then(sv => {
        if (!_.isEmpty(v)) sv.v = merge_v(sv_attrs(sv), sv.v, v);        
        return search_ldap.homonymes(sv.v).then(l => {
                console.log(`homonymes found for ${sv.v.givenName} ${sv.v.sn}: ${l.map(v => v.uid + " (score:" + v.score + ")")}`);
                const attrs = { score: {}, ...sv_attrs(sv) };
                return l.map(v => export_v(attrs, v) as search_ldap.Homonyme)
            })
    });
}

const exportStep = (step: step) : Partial<step> => (
    {
        attrs: typeof step.attrs === 'function' ? {} : exportAttrs(step.attrs),
        labels: step.labels,
        attrs_pre: step.attrs_pre,
        allow_many: step.allow_many,
    }
);
const loggedUserInitialSteps = (req: req) => (
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

router.get('/steps/loggedUserInitialSteps', (req : req, res) => {
    respondJson(req, res, loggedUserInitialSteps(req));
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
    respondJson(req, res, homonymes(req, req.params.id, {} as v));
});
router.post('/homonymes/:id', (req: req, res) => {
    respondJson(req, res, homonymes(req, req.params.id, body_to_v(req.body)));
});

function search_for_typeahead(req: req, search : (token: string, sizeLimit: number) => Promise<any>) {
    let token = req.query.token;
    if (!token) throw "missing token parameter";
    let sizeLimit = parseInt(req.query.maxRows) || 10;
    return search(token, sizeLimit);
}
router.get('/structures', (req: req, res) => {
    respondJson(req, res, search_for_typeahead(req, search_ldap.structures));
});
router.get('/etablissements', (req: req, res) => {
    respondJson(req, res, search_for_typeahead(req, search_ldap.etablissements));
});

export default router;
