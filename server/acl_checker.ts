'use strict';

import _ = require('lodash');

export const isAuthorized = (moderators: string[], user: CurrentUser) => (
    !moderators || user && user.mail && _.includes(moderators, user.mail)
);

export const moderators = (step: step, v: v): Promise<string[], any> => {
    let acls = step.acls;
    if (!acls) return <Promise<string[], any>> Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        acl(v, "mail")
    ))).then(mails => _.flatten(mails));
};
