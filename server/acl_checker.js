'use strict';

var _ = require('lodash');

exports.isAuthorized = function(moderators, user) {
    return !moderators || user && user.mail && _.includes(moderators, user.mail);
};

exports.moderators = function (step, v) {
    var acls = step.acls;
    if (!acls) return Promise.resolve(undefined);

    return Promise.all(_.map(acls, function (acl) {
	return acl(v, "mail");
    })).then(_.flatten);
};
