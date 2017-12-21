'use strict';

import { require_fresh, assert } from '../test_utils';
import * as test_ldap from '../test_ldap';

// get module types:
import * as __acl__ from '../../steps/acl';
type acl = typeof __acl__;

let acl: acl;

before(() => (
    test_ldap.create().then(() => {
        acl = require_fresh('../steps/acl');
    })
));

describe('user_id', () => {
    let acl_uid;
    before(() => acl_uid = acl.user_id('arigaux'));

    it('v_to_users should work', () => (
        acl_uid.v_to_users(undefined, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));

    it('v_to_users should work twice', () => (
        acl_uid.v_to_users(undefined, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));
    
    it('with eppn, v_to_users should work', () => (
        acl.user_id('arigaux@univ-paris1.fr').v_to_users(undefined, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));
    
    it('user_to_subv should work', () => (
        acl_uid.user_to_subv({ 'mail': 'ayme.rigaux@univ-paris1.fr' } as v).then(l => (
            assert.deepEqual(l, [{}])
        ))
    ));

    it('user_to_subv when no match', () => (
        acl_uid.user_to_subv({ 'mail': 'pascal.rigaux@univ-paris1.fr' } as v).then(l => (
            assert.deepEqual(l, [])
        ))
    ));
});

describe('ldapGroup', () => {
    let aclG;
    before(() => aclG = acl.ldapGroup("g1"));

    it('v_to_users should work', () => (
        aclG.v_to_users(undefined, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));

    it('user_to_subv should work', () => (
        aclG.user_to_subv({ 'mail': 'ayme.rigaux@univ-paris1.fr' } as v).then(l => (
            assert.deepEqual(l, [{}])
        ))
    ));
});

describe('structureRoles', () => {
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

    it('v_to_users should work', () => (
        acl.structureRoles('structureParrain', "(supannRoleGenerique=*)").v_to_users({ structureParrain: "DGH" } as v, 'uid').then(l => (
            assert.deepEqual(l, ['arigaux'])
        ))
    ));

    it('v_to_users should raise no_moderators', () => (
        acl.structureRoles('structureParrain', "(supannRoleGenerique=*)").v_to_users({ structureParrain: "xxx" } as v, 'uid').then(_ => {
            assert.fail("should raise error");
        }).catch(err => {
            assert.equal(err, 'no_moderators');
        })
    ));
    
    const user_2roles = { supannRoleEntite: [
        "[role={SUPANN}D30][type={SUPANN}S230][code=DGH]",
        "[role={SUPANN}D10][type={SUPANN}S230][code=DGHA]",
    ] } as v;
    it('user_to_subv should work', () => (
        acl.structureRoles('structureParrain', "(supannRoleGenerique=*)").user_to_subv(user_2roles).then(l => (
            assert.deepEqual(l, [{ structureParrain: "DGH" }, { structureParrain: "DGHA" }])
        ))
    ));
    it('user_to_subv if user with no role', () => (
        acl.structureRoles('structureParrain', "(supannRoleGenerique=*)").user_to_subv({} as v).then(l => (
            assert.deepEqual(l, [])
        ))
    ));
    
});
