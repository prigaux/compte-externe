'use strict';

var _ = require('lodash');
var actions = require('./actions');
var acl = require('./acl');

function readonly(attrs) {
    return _.mapValues(attrs, function (options) {
	return _.defaults({ readonly: true }, options);
    });
}

var attrs = {
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

var moderator_attrs = _.defaults({
    uid: {},
}, attrs);

var steps = {   
    extern: {
	attrs: attrs,
	next: 'homonymes',
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
	acls: [acl.user_id('prigaux'),
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

function allowedFirstSteps(req) {
    return ['extern'];
}

var firstStep = function (req) {
    var wanted_step = req.params.step;
    var allowed = allowedFirstSteps(req);
    if (wanted_step) {
	if (_.contains(allowed, wanted_step)) {
	    return wanted_step;
	} else {
	    throw "step " + wanted_step + " not allowed";
	}
    } else {
	return allowed[0];
    }
};

module.exports = { steps: steps, firstStep: firstStep };
