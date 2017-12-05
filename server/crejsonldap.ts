import utils = require('./utils');
import ldap = require('./ldap');
import conf = require('./conf');


export type options = {
    create: boolean,
    dupcreate: "ignore"|"warn"|"err";
}

const prepare_v = (v: v) => {
    if (!v) throw "internal error: createCompte with no v";

    if (!v.startdate) v.startdate = new Date();
    if (!v.enddate) {
        if (!v.duration) throw "no duration nor enddate";
        // "enddate" is *expiration* date and is rounded down to midnight (by ldap_convert.date.toLdap)
        // so adding a full 23h59m to help 
        v.enddate = utils.addDays(v.startdate, v.duration + 0.9999);
    }
    let v_ldap = ldap.convertToLdap(conf.ldap.people.types, conf.ldap.people.attrs, v, { toJson: true });
    delete v_ldap.userPassword; // handled by esup_activ_bo
    delete v_ldap.duration; // only useful to compute "enddate"
    return v_ldap;
}

const prepare_crejsonldap_param = (v: v) => {
    let { profilename, priority, startdate, enddate, ...attrs } = prepare_v(v);
    
    return {
        id: ["uid"],
        users: [
            { profilename, priority, startdate, enddate, attrs } ],
    };    
}

// NB: crejsonldap performance:
// - 200ms minimal response time
// - 200ms ssh overhead
// - 14MB RSS memory usage
export const call = (v: v, opts : options) => {
    let param = JSON.stringify({
        ...opts, ...prepare_crejsonldap_param(v)
    });
    console.log("action createCompte:", param);
    return utils.popen(param, 'createCompte', []).then(data => {
        try { 
            const resp = JSON.parse(data);
            return resp.users[0];
        } catch (e) {
            console.error(e);
            throw "createCompte error:" + data;
        }
    });
}

export const extract_uid = (resp) => {
    let m = resp.dn && resp.dn.match(/uid=(.*?),/);
    if (m) {
        return m[1];
    } else {
        console.error("createCompte should return dn");
        throw resp.err ? JSON.stringify(resp.err[0]) : "createCompte should return dn";
    }
};