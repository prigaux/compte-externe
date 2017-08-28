'use strict';

import _ = require('lodash');

export const checkAuthorized = (moderators: string[], user: CurrentUser) => {
    if (!moderators) {
        // no moderation
        // useful for initial steps + email address validation (the id has been sent in a mail)
    } else if (!user) {
        throw "Unauthorized"
    } else if (!user.mail || !_.includes(moderators, user.mail)) {
        throw "Forbidden"
    }
};

export const moderators = (acls: acl_search[], v: v): Promise<string[]> => {
    if (!acls) return <Promise<string[]>> Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        acl(v, "mail")
    ))).then(mails => _.flatten(mails));
};
