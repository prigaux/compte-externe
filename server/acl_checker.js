'use strict';

var _ = require('lodash');
var conf_steps = require('./steps/conf');

exports.isAuthorized = isAuthorized;
function isAuthorized(step, user) {
    var acls = step.acls;
    if (!acls) return Promise.resolve(true);
    if (!user || !user.id) return Promise.resolve(false);

    return Promise.all(_.map(acls, function (acl) {
	return acl.includes(user.id);
    })).then(function (bools) {
	if (_.some(bools)) {
	    return true;
	} else
	    return false;
    });
}

exports.authorizedSteps = function (user) {
    return Promise.all(_.map(conf_steps.steps, function (step, name) {
	return isAuthorized(step, user).then(function (b) {
	    return b && name;
	});
    })).then(_.compact);
};

exports.moderators = function (step) {
    var acls = step.acls;
    if (!acls) return Promise.resolve([]);

    return Promise.all(_.map(acls, function (acl) {
	return acl.list("mail");
    })).then(_.flatten);
};
