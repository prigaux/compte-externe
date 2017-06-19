'use strict';

import { require_fresh, assert } from '../test_utils';
import test_ldap = require('../test_ldap');

// get module types:
import __acl__ = require('../../steps/acl');
type acl = typeof __acl__;

describe('structureRoles', () => {
    let acl: acl;

    before(() => (
        test_ldap.create().then(() => {
            acl = require_fresh('../steps/acl');
        })
    ));

    describe('_rolesGeneriques', () => {    
        it('should work', () => (
            acl._rolesGeneriques("(supannRoleGenerique=*)").then(l => (
                assert.deepEqual(l, [ '{SUPANN}F10', '{SUPANN}D30', '{SUPANN}D10', '{SUPANN}D00' ])
            ))
        ));
        it('should filter roles', () => (
            acl._rolesGeneriques("(supannRefId={HARPEGE.FCSTR}*)").then(l => (
                assert.deepEqual(l, [ '{SUPANN}F10', '{SUPANN}D30' ])
            ))
        ));
    });    

    it('should work', () => (
        acl.structureRoles(v => v.structureParrain, "(supannRoleGenerique=*)")({ structureParrain: "DGH" }, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));
});
