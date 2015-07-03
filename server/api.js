'use strict';

var _ = require('lodash');
var express = require('express');
var acl_checker = require('./acl_checker');
var db = require('./db');
var utils = require('./utils');
var search_ldap = require('./search_ldap');
var mail = require('./mail');
var conf = require('./conf');
var conf_steps = require('./steps/conf');
require('./helpers');

var router = express.Router();

var bus = utils.eventBus();


function step(sv) {
    return conf_steps.steps[sv.step];
}

function action_pre(req, sv) {
    return action(req, sv, 'action_pre');
}
function action_post(req, sv) {
    return action(req, sv, 'action_post').tap(function (sv) {
	mayNotifyModerators(req, sv, 'accepted');
    });
}
function action(req, sv, action_name) {
    var f = step(sv)[action_name];
    if (!f) return Promise.resolve(sv); // nothing to do
    //console.log("calling " + action_name + " for step " + sv.step);
    return f(req, sv).then(function (vr) {
	//console.log("action returned", vr);
	return _.defaults(vr, sv);
    });
}

function mergeAttrs(attrs, prev, v) {
    return _.assign(prev, removeHiddenAttrs(attrs, v));
}

function removeHiddenAttrs(attrs, v) {
    return _.omit(v, function (val, key) { 
	return !attrs[key] || attrs[key].hidden;
    });
}

function sv_removeHiddenAttrs(sv) {
    sv = _.clone(sv);
    sv.v = removeHiddenAttrs(step(sv).attrs, sv.v);
    return sv;
}

function mayNotifyModerators(req, sv, notifyKind) {
    var notify = step(sv).notify;
    if (!notify) return;
    var mails = sv.moderators;
    if (mails.length) {
	var params = _.merge({ to: mails.join(', '), moderator: req.user, conf: conf }, sv);
	mail.sendWithTemplate(notify[notifyKind], params);
    }
}

function checkAcls(req, sv) {
    var ok = acl_checker.isAuthorized(sv.moderators, req.user);
    if (ok) {
	console.log("authorizing", req.user, "for step", sv.step);
    } else {
	throw "unauthorised";
    }
}

function first_sv(req) {
    var step = conf_steps.firstStep(req);
    var empty_sv = { step: step, v: {} };
    return action_pre(req, empty_sv);
}

function getRaw(req, id) {
    if (id === 'new') {
	return first_sv(req);
    } else {
	return db.get(id).tap(function (sv) {
	    if (!sv) throw "invalid id " + id;
	    if (!sv.step) throw "internal error: missing step for id " + id;
	    checkAcls(req, sv);
	});
    }
}

function get(req, id) {
    return getRaw(req, id).then(sv_removeHiddenAttrs).then(function (sv) {
	sv.attrs = _.omit(step(sv).attrs, function (val) {
	    return val.hidden;
	});
	return sv;
    });
}

function set(req, id, v) {
    return getRaw(req, id).then(function (sv) {
	return setRaw(req, sv, v);
    });
}

// 1. merge allow new v attrs into sv
// 2. call action_post
// 3. advance to new step
// 4. call action_pre
// 5. save to DB or remove from DB if one action returned null
function setRaw(req, sv, v) {
    if (!sv.id) {
	// do not really on id auto-created by mongodb on insertion in DB since we need the ID in action_pre for sendValidationEmail
	sv.id = db.new_id();
    }
    sv.v = mergeAttrs(step(sv).attrs, sv.v, v);
    return action_post(req, sv).then(function (svr) {
	svr.step = step(svr).next;
	if (svr.step) {
	    return action_pre(req, svr);
	} else {
	    return svr;
	}
    }).then(function (svr) {
	if (svr.step) {
	    return acl_checker.moderators(step(svr), svr.v).then(function (mails) {
		svr.moderators = mails;
		return svr;
	    });
	} else {
	    return svr;
	}
    }).tap(function (svr) {
	var sv = _.omit(svr, 'response');
	if (sv.step) {
	    return saveRaw(req, sv);
	} else {
	    return removeRaw(sv.id);
	}
    }).then(function (svr) {
	var r = _.assign({success: true}, svr.response);
	if (svr.step) r.step = svr.step;
	return r;
    });
}

function saveRaw(req, sv) {
    return db.save(sv).then(function (sv) {
	bus.emit('changed');
	mayNotifyModerators(req, sv, 'added');
    });
}

function removeRaw(id) {
    return db.remove(id).then(function () {
	bus.emit('changed');
    });
}

function remove(req, id) {
    return getRaw(req, id).then(function (sv) {
	// acls are checked => removing is allowed
	mayNotifyModerators(req, sv, 'rejected');
	return removeRaw(sv.id);
    });
}

function listAuthorized(req) {
    return db.listByModerator(req.user).then(function (svs) {
	return _.map(svs, sv_removeHiddenAttrs);
    });
}

function homonymes(req, id) {
    return getRaw(req, id).then(function (sv) {
	// acls are checked => removing is allowed
	var sns = _.merge(_.at(sv.v, conf.ldap.people.sns));
	var givenNames = _.merge(_.at(sv.v, conf.ldap.people.givenNames));
	if (sns[0] === undefined) return [];
	console.log("sns", sns);
	return search_ldap.homonymes(
	    sns,
	    givenNames,
	    new Date(sv.v.birthDay),
	    _.keys(step(sv).attrs));
    });
}

function respondJson(req, res, p) {
    var logPrefix = req.method + " " + req.path + ":";
    p.then(function (r) {
	console.log(logPrefix, r);
	res.json(r || {});
    }, function (err) {
	console.error(logPrefix, err + err.stack);
	res.json({error: ""+err, stack: err.stack});
    });
}

router.get('/comptes', function(req, res) {
    if (req.query.poll) {
	bus.once('changed', function () {
	    respondJson(req, res, listAuthorized(req));
	});
    } else {
	respondJson(req, res, listAuthorized(req));
    }
});

router.get('/comptes/new/:step', function(req, res) {
    respondJson(req, res, get(req, 'new'));
});

router.get('/comptes/:id', function(req, res) {
    respondJson(req, res, get(req, req.params.id));
});

router.put('/comptes/new/:step', function(req, res) {
    respondJson(req, res, set(req, 'new', req.body));
});

router.put('/comptes/:id', function(req, res) {
    respondJson(req, res, set(req, req.params.id, req.body));
});

router.delete('/comptes/:id', function(req, res) {
    respondJson(req, res, remove(req, req.params.id));
});

router.get('/homonymes/:id', function(req, res) {
    respondJson(req, res, homonymes(req, req.params.id));
});

function search_structures(req) {
    var token = req.query.token;
    if (!token) throw "missing token parameter";
    var sizeLimit = parseInt(req.query.maxRows) || 10;
    return search_ldap.structures(token, sizeLimit);
}
router.get('/structures', function(req, res) {
    respondJson(req, res, search_structures(req));
});

module.exports = router;
