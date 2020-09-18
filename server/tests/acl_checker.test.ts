'use strict';

import { assert } from './test_utils';
import * as test_ldap from './test_ldap';

import * as acl from '../steps/acl';
import * as acl_checker from '../acl_checker';

describe('global', () => {
 before(() => test_ldap.create())
 after(() => test_ldap.stop())

 describe('moderators', () => {
    it('should work', () => (
        acl_checker.moderators([ acl.user_id("arigaux") ], undefined).then(l => assert.deepEqual(l, [ 'ayme.rigaux@univ-paris1.fr' ]))
    ))
    it('should work on empty case', () => (
        acl_checker.moderators([], undefined).then(_ => assert.fail("should raise")).catch(err => assert.equal(err, "no_moderators"))
    ))
    it('should work on multiple users', () => (
        acl_checker.moderators([ acl.user_id("arigaux"), acl.user_id("prigaux"), acl.user_id("arigaux") ], undefined).then(l => assert.deepEqual(l, [ undefined, 'ayme.rigaux@univ-paris1.fr' ]))
    ))
 });

 describe('allowed_step_ldap_filters', () => {
    let steps, steps2;
    before(() => { 
      steps = { 
        "xxx": { acls: [ acl.user_id("arigaux") ], labels: undefined },
      };
      steps2 = {
        ...steps,
        "yyy": { acls: [ acl.user_id("arigaux"), acl.ldapGroup('g1') ], labels: undefined },          
      }
    });

    it('should work', () => (
        acl_checker.allowed_step_ldap_filters({ id: "arigaux" } as CurrentUser, steps).then(l => assert.deepEqual(l, [ 
            { step: 'xxx', filter: undefined },
        ]))
    ))
    it('should deny', () => (
        acl_checker.allowed_step_ldap_filters({ id: "prigaux" } as CurrentUser, steps).then(l => assert.deepEqual(l, []))
    ))
    it('should simplify ldap filters', () => (
        acl_checker.allowed_step_ldap_filters({ id: "arigaux" } as CurrentUser, steps2).then(l => assert.deepEqual(l, [ 
            { step: 'xxx', filter: undefined },
            { step: 'yyy', filter: undefined },
        ]))
    ))
 });

/*
describe('mongo_query', () => {
    it('should work', () => {
        const allowed_ssubvs = [ { step: "import", subvs: [{"structureParrain":"DGH"}]}];
        assert.deepEqual(acl_checker.mongo_query(allowed_ssubvs), { step: 'import', "v.structureParrain":"DGH" } );
    });
    it('should handle oneOf', () => {
        const allowed_ssubvs = [ 
            {step: "extern", subvs: [{}]}, 
            {step: "import", subvs: [{"structureParrain":"DGHA"},{"structureParrain":"DGH"}]},
        ];
        assert.deepEqual(acl_checker.mongo_query(allowed_ssubvs), { '$or': [ { step: 'extern' }, { step: 'import', '$or': [{"v.structureParrain":"DGHA"},{"v.structureParrain":"DGH"}] } ] });
    });
    it('should query multiple vals', () => {
        const allowed_ssubvs = [ { step: "import", subvs: [{"structureParrain":"DGH", "profilename": "xx"}]}];
        assert.deepEqual(acl_checker.mongo_query(allowed_ssubvs), { step: 'import', "v.structureParrain":"DGH", "v.profilename": "xx" } );
    });
});*/

});