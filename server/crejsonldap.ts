import * as _ from 'lodash';
import * as utils from './utils';
import * as ldap from './ldap';
import * as conf from './conf';
import grouped_calls from './helper_grouped_calls';


export type options = { action: "validate" } | { create: false } | {
    create: true;
    dupcreate: "ignore"|"warn"|"err";
    dupmod: "ignore"|"warn"|"err";
}

const prepare_v = (v: v) => {
    if (!v) throw "internal error: createCompte with no v";

    let v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, v, { toJson: true });
    delete v_ldap.userPassword; // handled by esup_activ_bo
    delete v_ldap.duration; // only useful to compute "enddate"
    return v_ldap;
}

const prepare_crejsonldap_param = (v: v) => {
    let { profilename, priority, startdate, enddate, ...attrs } = prepare_v(v);
    
    return { profilename, priority, startdate, enddate, attrs };
}

// NB: crejsonldap performance:
// - 200ms minimal response time
// - 200ms ssh overhead
// - 14MB RSS memory usage
const call_many = (vs: v[], opts : options) => {
    let param = JSON.stringify({
        retattrs: ['uid', 'accountStatus'],
        ...opts, 
        id: ["uid"],
        users: vs.map(prepare_crejsonldap_param),
    });
    console.log("action createCompte:", param.replace(/"jpegPhoto":"(.*?)"/g, `"jpegPhoto":"xxx"`));
    return callRaw.fn(param).then(data => {
        try { 
            const resp = JSON.parse(data);
            return resp.users;
        } catch (e) {
            console.error(e);
            throw "createCompte error:" + data;
        }
    });
}

const grouped_call_many_by_opts : Dictionary<(param: v) => any> = {};

export const call = (v: v, opts: options) => {
    const opts_s = JSON.stringify(opts);
    let grouped_call = grouped_call_many_by_opts[opts_s];
    if (!grouped_call) {
        grouped_call = grouped_call_many_by_opts[opts_s] = grouped_calls<v, any>(vs => call_many(vs, opts), conf.crejsonldap.grouped_calls);
    }
    return grouped_call(v)
}

// exported for tests purpose
export const callRaw = { fn: (param) => utils.popen(param, 'createCompte', []) };

export const throw_if_err = (resp) => {
    const err = resp.err && resp.err[0];
    if (err && err.code === "badval") {
        throw ({ code: "Bad Request", error: "Valeur " + err.val  + " non valide" });
    }
    if (resp.err) {
        throw err || resp.err;
    }
    return resp;
};

export type accountStatus = undefined | "active" | "disabled" | "deleted"

export const extract_attrs = (resp): { uid: string, accountStatus: accountStatus} => {
    if (resp.attrs && resp.attrs.uid) {
        return _.mapValues(resp.attrs, l => l[0]) as any;
    } else {
        console.error("createCompte should return attrs.uid");
        throw resp.err ? JSON.stringify(resp.err[0]) : "createCompte should return attrs.uid";
    }
};

export const mayRetryWithoutSupannAliasLogin = (v: v, opts: options) => (resp) => {
        if (resp.err) console.error("createCompte returned", resp);
        if (resp.err && resp.err[0].attr === "supannAliasLogin") {
            // gasp, the generated supannAliasLogin is already in use,
            // retry without supannAliasLogin
            delete v.supannAliasLogin;
            return call(v, opts);
        } else {
            return resp;
        }
};

export const createMayRetryWithoutSupannAliasLogin = (v: v, opts: options) => (
    call(v, opts)
        .then(mayRetryWithoutSupannAliasLogin(v, opts))
        .then(extract_attrs)
);
