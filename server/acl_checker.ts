'use strict';

import _ = require('lodash');

export const isAuthorized = (moderators, user) => (
    !moderators || user && user.mail && _.includes(moderators, user.mail)
);

export const moderators = (step: step, v: v) => {
    let acls = step.acls;
    if (!acls) return Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        acl(v, "mail")
    ))).then(_.flatten);
};
