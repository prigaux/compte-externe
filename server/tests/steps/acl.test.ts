'use strict';

import { require_fresh, assert } from '../test_utils';
import * as test_ldap from '../test_ldap';

// get module types:
import * as __acl__ from '../../steps/acl';
type acl = typeof __acl__;

let acl: acl;

before(() => (
    test_ldap.create().then(() => {
        require_fresh('../search_ldap');
        acl = require_fresh('../steps/acl');
    })
));

describe('user_id', () => {
    let acl_uid : acl_search;
    before(() => acl_uid = acl.user_id('arigaux'));

    it('v_to_ldap_filter should work', () => (
        acl_uid.v_to_ldap_filter(undefined).then(filter => (
            assert.deepEqual(filter, '(uid=arigaux)')
        ))
    ));

    it('with eppn, v_to_ldap_filter should work', () => (
        acl.user_id('arigaux@univ-paris1.fr').v_to_ldap_filter(undefined).then(filter => (
            assert.deepEqual(filter, '(eduPersonPrincipalName=arigaux@univ-paris1.fr)')
        ))
    ));
    
    it('user_to_ldap_filter should work', () => (
        acl_uid.user_to_ldap_filter({ 'mail': 'ayme.rigaux@univ-paris1.fr' } as CurrentUser).then(filter => (
            assert.deepEqual(filter, true)
        ))
    ));

    it('user_to_ldap_filter when no match', () => (
        acl_uid.user_to_ldap_filter({ 'mail': 'pascal.rigaux@univ-paris1.fr' } as CurrentUser).then(filter => (
            assert.deepEqual(filter, false)
        ))
    ));

});

describe('ldapGroup', () => {
    let aclG : acl_search;
    before(() => aclG = acl.ldapGroup("g1"));

    it('v_to_ldap_users should work', () => (
        aclG.v_to_ldap_filter(undefined).then(filter => (
            assert.deepEqual(filter, '(memberOf=cn=g1,ou=groups,dc=univ,dc=fr)')
        ))
    ));

    it('user_to_ldap_filter should work', () => (
        aclG.user_to_ldap_filter({ 'mail': 'ayme.rigaux@univ-paris1.fr' } as CurrentUser).then(filter => (
            assert.deepEqual(filter, true)
        ))
    ));
});

describe('structureRoles', () => {
    describe('_rolesGeneriques', () => {    
        it('should work', () => (
            acl._rolesGeneriques("(up1TableKey=*)").then(l => (
                assert.deepEqual(l, [ '{SUPANN}F10', '{SUPANN}D30', '{SUPANN}D10', '{SUPANN}D00' ])
            ))
        ));
        it('should filter roles', () => (
            acl._rolesGeneriques("(supannRefId={HARPEGE.FCSTR}*)").then(l => (
                assert.deepEqual(l, [ '{SUPANN}F10', '{SUPANN}D30' ])
            ))
        ));
    });    

    it('v_to_ldap_filter should work', () => (
        acl.structureRoles('structureParrain', "(up1TableKey=*)").v_to_ldap_filter({ structureParrain: "DGH" } as v).then(filter => (
            assert.deepEqual(filter, '(|(supannRoleEntite=*[role={SUPANN}F10]*[code=DGH]*)(supannRoleEntite=*[role={SUPANN}D30]*[code=DGH]*)(supannRoleEntite=*[role={SUPANN}D10]*[code=DGH]*)(supannRoleEntite=*[role={SUPANN}D00]*[code=DGH]*))')
        ))
    ));

    it('user_to_ldap_filter should work', () => (
        acl.structureRoles('structureParrain', "(up1TableKey=*)").user_to_ldap_filter({ 'id': 'arigaux@univ-paris1.fr' } as CurrentUser).then(filter => (
            assert.deepEqual(filter, '(supannParrainDN=supannCodeEntite=DGH,ou=structures,dc=univ-paris1,dc=fr)')
        ))
    ));
    it('user_to_ldap_filter if user with no role', () => (
        acl.structureRoles('structureParrain', "(up1TableKey=*)").user_to_ldap_filter({ 'id': 'ayrigaux@univ-paris1.fr' } as CurrentUser).then(filter => (
            assert.deepEqual(filter, '(|(supannParrainDN=supannCodeEntite=DGH,ou=structures,dc=univ-paris1,dc=fr)(supannParrainDN=supannCodeEntite=DGHA,ou=structures,dc=univ-paris1,dc=fr))')
        ))
    ));
});
