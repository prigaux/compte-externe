/// <reference path='types.d.ts' />

import * as _ from 'lodash';
import * as express from 'express';
import * as acl_checker from './acl_checker';
import * as db from './db';
import * as helpers from './helpers';
import * as utils from './utils';
import * as search_ldap from './search_ldap';
import * as mail from './mail';
import shared_conf from '../shared/conf';
import * as conf from './conf';
import * as conf_steps from './steps/conf';
import { export_v, merge_v, exportAttrs, merge_attrs_overrides, selectUserProfile, checkAttrs, transform_object_items_oneOf_async_to_oneOf, findStepAttr, flatMapAttrs } from './step_attrs_option';
import { filters } from './ldap';
import gen_gsh_script from './gen_gsh_script';
require('./helpers'); // for Promise.prototype.tap

_.each(conf_steps.steps, checkAttrs)

const router = express.Router();

const bus = utils.eventBus();
const respondJson = utils.respondJson;

function name2step(name: string): step {
    let r = conf_steps.steps[name];
    if (!r) {
        console.trace("invalid step " + name);
        throw "invalid step " + name;
    }
    return r;
}

const step = (sv: sv) => name2step(sv.step);

async function add_step_attrs<SV extends sv>(req: req, sv: SV) {
    const { attrs, attrs_override } = step(sv);
    let sva = sv as SV & { attrs: StepAttrsOption };
    sva.attrs = attrs_override ? merge_attrs_overrides(attrs, await attrs_override(req, sv)) : attrs;
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
function action<SV extends sv>(req: req, sv: SV, action_name: 'action_post' | 'action_pre'): Promise<SV & { response?: response }> {
    let f = step(sv)[action_name];
    if (!f) return Promise.resolve(sv); // nothing to do
    //console.log("calling " + action_name + " for step " + sv.step);
    // @ts-expect-error
    return f(req, sv).then(vr => {
        //console.log("action returned", vr);
        return _.defaults(vr, sv);
    });
}

async function may_export_v_ldap(sv: sva) {
    if (sv.v && sv.v.uid) {
        let v_ldap: v = await search_ldap.onePerson(filters.eq("uid", sv.v.uid));
        if (sv.v.profilename_to_modify) {
            const v_ldap_ = selectUserProfile(v_ldap, sv.v.profilename_to_modify)
            if (v_ldap_) v_ldap = v_ldap_;
        }
        v_ldap = export_v(sv_attrs(sv), v_ldap) as v;
        return { ...sv, v_ldap };
    }
    return sv;
}

async function export_sv(req: req, sv: sva): Promise<ClientSideSVA> {
    sv = _.clone(sv);
    sv.v = export_v(sv_attrs(sv), sv.v) as v;
    await transform_object_items_oneOf_async_to_oneOf(sv.attrs, sv.v) // modifies sv.attrs
    const attrs = exportAttrs(sv.attrs, req.translate);
    return { ...sv as any, stepName: sv.step, ...await exportStep(req, step(sv)), attrs };
}

function mayNotifyModerators(req: req, sv: sv|svra, notifyKind: 'accepted'|'added'|'rejected') {
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

function checkAcls(req: req, sv: sv) {
    return acl_checker.checkAcl(req.user, sv.v, step(sv).acls).then(check => {
        if (check === true) {
            console.log("authorizing", req.user, "for step", sv.step);
        } else if (!req.user) {
            throw "Unauthorized";
        } else {
            console.error(req.user, "not authorized for step", sv.step, check.error, sv.v);
            throw "Forbidden"
        }
    })
}

function first_sv(req: req, wanted_step: string): Promise<sv> {
    let empty_sv: sv = { step: wanted_step, v: {}, history: [] };
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
        if (!sv.step) throw format_history_event(sv)
        if (wanted_step && sv.step !== wanted_step) {
            console.error("user asked for step " + wanted_step + ", but sv is in state " + sv.step);
            throw format_history_event(sv)
        }
    }
    await checkAcls(req, sv);
    return await add_step_attrs(req, sv);
}

async function get(req: req, id: id, wanted_step: string) {
    let sv = await getRaw(req, id, wanted_step)
    if (id !== 'new') sv = await may_export_v_ldap(sv)
    return await export_sv(req, sv)
    // TODO add potential_homonyms si id !== 'new' && attrs && attrs.uid
}

async function search_with_acls(req: req, wanted_step: string) {
    let token = req.query.token;
    if (!token) return Promise.reject("missing token parameter");
    if (!req.user) return Promise.reject("Unauthorized");
    const sizeLimit = parseInt(req.query.maxRows) || 10;
    const step = conf_steps.steps[wanted_step];

    const acl_ldap_filter = await acl_checker.user_to_ldap_filter(req.user, step.acls);
    const attrTypes = _.pick(conf.ldap.people.types, ['sn', 'givenName', 'uid', 'global_profilename']);
    const vs = await search_ldap.searchPeople_matching_acl_ldap_filter(acl_ldap_filter, step.search_filter, token, attrTypes, { sizeLimit });
    return _.sortBy(vs, 'displayName')
}

function set_new_many(req: req, wanted_step: string, vs: v[]) {
    return Promise.all(vs.map(v => set(req, 'new', wanted_step, v).catch(error => (console.log(error), { error }))));
}

async function set(req: req, id: id, wanted_step: string, v: v) {
    const sv = await getRaw(req, id, wanted_step);
    const svr = await setRaw(req, sv, v);

    let r = <r> { success: true, ...svr.response };
    if (svr.step) {
        r.step = svr.step;
        r.labels = step(svr).labels;
    }

    const nextBrowserStep = name2step(wanted_step).nextBrowserStep;
    if (nextBrowserStep) {
        r.nextBrowserStep = typeof nextBrowserStep === "function" ? await nextBrowserStep(svr.v) : nextBrowserStep;
    }
    return r;
}

function format_history_event(sv: sv) {
    const date = helpers.to_DD_MM_YYYY(sv.modifyTimestamp)
    if (sv.step) {
        return "La demande est en attente à l'étape « " + step(sv).labels.title + " » depuis le " + date
    } else {
        return _.last(sv.history)?.rejected ? "La demande a été rejetée le " + date :
                "La demande est terminée depuis le " + date
    }
}

function add_history_event(req: req, sv: sv, action?: 'rejected') {
    (sv.history ??= []).push({
        when: new Date(),
        who: req.user,
        step: { id: sv.step, title: step(sv).labels.title },
        ...action === 'rejected' ? { rejected: true } : {},
    })
}

function advance_sv(req: req, sv: sva) : Promise<svr> {
    if (!sv.id) {
        // do not rely on id auto-created by mongodb on insertion in DB since we need the ID in action_pre for sendValidationEmail
        sv.id = db.new_id();
    }
    return action_post(req, sv).then(async svr => {
        const nextStep = step(svr).next;
        svr.step = typeof nextStep === "function" ? await nextStep(svr.v) : nextStep;
        if (svr.step) {
            return action_pre(req, svr);
        } else {
            return svr;
        }
    }).then(svr => {
        return svr.step ? add_step_attrs(req, svr) : svr as svra;
    });
}

const checkSetLock = (sv: sv) : Promise<any> => (
    sv.lock ? Promise.reject("locked") : sv.id ? db.setLock(sv.id, true) : Promise.resolve()
);

// 1. merge allow new v attrs into sv
// 2. call action_post
// 3. advance to new step
// 4. call action_pre
// 5. save to DB or remove from DB if one action returned null
function setRaw(req: req, sv: sva, v: v) : Promise<svr> {
    sv.v = merge_v(sv_attrs(sv), shared_conf.default_attrs_opts, sv.v, v);
    add_history_event(req, sv)
    return checkSetLock(sv).then(_ => (
        advance_sv(req, sv)
    )).tap(svr => {
        let sv = <sv> _.omit(svr, 'response', 'attrs');
        if (sv.v.various) delete sv.v.various.diff;
        if (sv.step) {
            return saveRaw(req, sv);
        } else {
            return removeRaw(sv);
        }
    }).finally(() => db.setLock(sv.id, false))
}

function saveRaw(req: req, sv: sv) {
    return db.save(sv).then(sv => {
        bus.emit('changed');
        mayNotifyModerators(req, sv, 'added');
    });
}

function removeRaw(sv: sv) {
    return db.save(_.pick(sv, 'id', 'history'), { upsert: false }).then(() => {
        bus.emit('changed');
    });
}

function remove(req: req, id: id, wanted_step: string) {
    return getRaw(req, id, wanted_step).then(sv => {
        // acls are checked => removing is allowed
        mayNotifyModerators(req, sv, 'rejected');
        add_history_event(req, sv, 'rejected')
        return removeRaw(sv);
    }).then(_ => ({ success: true }));
}

const initial_steps = () => (
    _.pickBy(conf_steps.steps, (step) => step.initialStep)
);

const title_in_list = (labels: StepLabels) => (
    "title_in_list" in labels ? labels.title_in_list : labels.title
)

const non_initial_steps = () => (
    _.pickBy(conf_steps.steps, (step) => !step.initialStep && title_in_list(step.labels))
);

async function listAuthorized(req: req) {
    if (!req.user) return Promise.reject("Unauthorized");
    const query = await acl_checker.mongo_query(req.user, non_initial_steps())
    let svs = await db.listByModerator(query);
    
    if (!svs) return null;
    svs = svs.filter(sv => {
        const valid = sv.step in conf_steps.steps;
        if (!valid) console.error("ignoring sv in db with invalid step " + sv.step);
        return valid;
    });
    const svas = await Promise.all(svs.map(sv => add_step_attrs(req, sv)))
    return await helpers.pmap(svas, sva => export_sv(req, sva));
}

const body_to_v = search_ldap.v_from_WS;

async function homonymes(req: req, id: id, wanted_step: string, v: v): Promise<search_ldap.Homonyme[]> {
    const sv = await getRaw(req, id, wanted_step)

    // we merge sv from database with information corrected by moderator. Useful to recheck homonymes after a correction
    if (!_.isEmpty(v)) sv.v = merge_v(sv_attrs(sv), shared_conf.default_attrs_opts, sv.v, v);        

    let homonym_attrs: Set<string> = new Set()
    // uniq is needed since we allow the "homonymes" function for different attrs
    // (useful when we want to merge multiple attributes from the same source. for example "uid" + "supannAliasLogin")
    const fns = _.uniq(flatMapAttrs(sv_attrs(sv), (opts, attr) => {
        const fn = opts.homonyms || opts.uiType === 'homonym' && search_ldap.homonymes
        if (fn) {
            homonym_attrs.add(attr)
            return [fn]
        } else {
            return []
        }
    }))
    if (!fns.length) {
        throw "homonyms: invalid step attr " + sv.step;
    }
    const l = _.flatten(await Promise.all(fns.map(fn => fn(sv.v))))
    if (l.length) {
        console.log(`homonymes found for ${sv.v.givenName} ${sv.v.sn}: ${l.map(v => JSON.stringify(_.pick(v, Array.from(homonym_attrs))) + " (score:" + v.score + ")")}`);
    }
    const attrs = { score: {}, mergeAll: {}, ...sv_attrs(sv) };
    return l.map(v => export_v(attrs, v) as search_ldap.Homonyme)
}

const translateLabels = (labels: ClientSideStepLabels, translate: translate): ClientSideStepLabels => {
    for (const field of helpers.objectKeys(labels)) {
        if (labels[field]) translate(labels[field])
    }
    return labels
}

const exportLabels = async (req: req, { description_in_list, ...labels }: StepLabels): Promise<ClientSideStepLabels> => {
    if (typeof description_in_list === 'function') {
        description_in_list = await description_in_list(req)
    }
    return translateLabels({ ...labels, description_in_list }, req.translate)
}

const exportStep = async (req: req, step: step) => (
    {
        attrs: typeof step.attrs === 'function' ? {} : exportAttrs(step.attrs, req.translate),
        step: {
            labels: await exportLabels(req, step.labels),
            ..._.pick(step, 'allow_many', 'if_no_modification'),
        },
    }
);

const loggedUserInitialSteps = async (req: req) => {
  const l = await acl_checker.allowed_step_ldap_filters(req.user, initial_steps())
  const l_ = l.map(({ step, filter }) => (
        { id: step, filter, stepName: step, step: conf_steps.steps[step] }
  )).filter(({ step }) => (
          step.initialStep
  ))
  return await helpers.pmap(l_, async ({ id, stepName, step, filter }) => (
    { id, 
      stepName,
      ldap_filter: filter,
      ...await exportStep(req, step),
    }
  ))
}

router.get('/steps/loggedUserInitialSteps', (req : req, res) => {
    respondJson(req, res, loggedUserInitialSteps(req));
});
    
router.get('/comptes', (req : req, res) => {
    if (req.query.poll) {
        // raise the limit above what we want
        req.setTimeout(conf.poll_maxTime * 2, () => res.json({ error: "internal error" }));

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
    req.setTimeout(0, undefined); // disable timeout, import may take a looong time    
    respondJson(req, res, set_new_many(req, req.params.step, req.body.map(body_to_v)));
});

router.put('/comptes/:id/:step?', (req: req, res) => {
    respondJson(req, res, set(req, req.params.id, req.params.step, body_to_v(req.body)));
});

router.delete('/comptes/:id/:step?', (req: req, res) => {
    respondJson(req, res, remove(req, req.params.id, req.params.step));
});

router.get('/homonymes/:id/:step?', (req: req, res) => {
    respondJson(req, res, homonymes(req, req.params.id, req.params.step, {} as v));
});
router.post('/homonymes/:id/:step?', (req: req, res) => {
    respondJson(req, res, homonymes(req, req.params.id, req.params.step, body_to_v(req.body)));
});

function search_for_typeahead(req: req, step: string, attr: string) {
    const opts = findStepAttr(name2step(step).attrs, (opts, attr_) => opts.oneOf_async && attr === attr_)?.opts
    if (!opts) {
        throw "search: invalid step attr " + step + ' ' + attr;
    }
    if (!("token" in req.query)) return Promise.reject("missing token parameter");
    let token = req.query.token;
    let sizeLimit = parseInt(req.query.maxRows) || 0; // defaults to unlimited. not allowing this is up to "oneOf_async" function
    return opts.oneOf_async(token, sizeLimit)
}
router.get('/search/:step/:attr', (req : req, res) => {
    res.header('Cache-Control', 'private, max-age=60') // minimal caching
    respondJson(req, res, search_for_typeahead(req, req.params.step, req.params.attr))
});

router.post('/csv2json', utils.csv2json);

router.get('/gen_gsh_script', gen_gsh_script);


export default router;
