'use strict';

import _ = require('lodash');

export const isAuthorized = (moderators: string[], user: CurrentUser) => (
    !moderators || user && user.mail && _.includes(moderators, user.mail)
);

export const moderators = (acls: acl_search[], v: v): Promise<string[]> => {
    if (!acls) return <Promise<string[]>> Promise.resolve(undefined);

    return Promise.all(_.map(acls, acl => (
        acl(v, "mail")
    ))).then(mails => _.flatten(mails));
};
