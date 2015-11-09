'use strict';

const _ = require('lodash');

exports.isAuthorized = (moderators, user) => (
    !moderators || user && user.mail && _.includes(moderators, user.mail)
);

exports.moderators = (step, v) => {
    let acls = step.acls;
    if (!acls) return Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
	acl(v, "mail")
    ))).then(_.flatten);
};
