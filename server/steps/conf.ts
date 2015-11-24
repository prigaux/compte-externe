'use strict';

import _ = require('lodash');
import express = require('express');
import actions = require('./actions');
import acl = require('./acl');
import main_conf = require('../conf');

function readonly(attrs): StepAttrsOption {
    return _.mapValues(attrs, options => (
        _.defaults({ readonly: true }, options)
    ));
}

const attrs: StepAttrsOption = {
    supannCivilite: {},
    sn: {},
    givenName: {},
    birthName: {},
    birthDay: {},
    homePostalAddress: {},
    homePhone: {},
    supannMailPerso: {},
    structureParrain: {},
};

const moderator_attrs = <StepAttrsOption> _.defaults({
    uid: {},
    supannAliasLogin: {},
    structureParrain: { readonly: true },
}, attrs);

export const steps: steps = {
    extern: {
        attrs: attrs,
        next: 'homonymes',
    },

    federation: {
        attrs: attrs,
        action_pre: actions.getShibAttrs,
        next: 'homonymes',
    },

    cas: {
        attrs: {},
        action_post: actions.getCasAttrs,
        next: 'moderate',
    },

    homonymes: {
        acls: [acl.user_id('prigaux'),
               acl.user_id('fchevreau'),
               acl.user_id('branciar'),
               //acl.ldapGroup("employees.administration.DGHB")
              ],
        notify: { added: 'homonymes_check.html',
                  accepted: 'homonymes_done.html',
                  rejected: 'moderation_rejected.html' },
        attrs: moderator_attrs,
        next: 'validate_email',
    },

    validate_email: {
        action_pre: actions.sendValidationEmail,
        attrs: readonly(moderator_attrs),
        next: 'moderate',
    },

    moderate: {
        acls: [acl.autoModerateIf(v => v.autoCreate),
               acl.user_id('prigaux'),
               acl.user_id('fchevreau'),
               acl.user_id('branciar'),
               //acl.ldapGroup("employees.administration.DGHB")
              ],
        notify: { added: 'moderation_needed.html',
                  accepted: 'moderation_accepted.html',
                  rejected: 'moderation_rejected.html' },
        attrs: moderator_attrs,
        action_post: actions.createCompte
    },
};

function allowedFirstSteps(req: express.Request): string[] {
    let l = ['extern'];
    if (req.user) {
        l.push('federation');
        let idp = req.header('Shib-Identity-Provider');
        if (idp && idp === main_conf.cas_idp)
            l.push('cas');
    }
    return l;
}

export function firstStep(req: express.Request): string {
    let wanted_step: string = req.params.step;
    let allowed = allowedFirstSteps(req);
    if (wanted_step) {
        if (_.contains(allowed, wanted_step)) {
            return wanted_step;
        } else {
            throw "step " + wanted_step + " not allowed";
        }
    } else {
        return allowed[0];
    }
}
