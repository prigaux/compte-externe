'use strict';

import * as _ from 'lodash';
import { assert } from './test_utils';
import * as test_ldap from './test_ldap';

import * as conf from '../conf'
import * as search_ldap from '../search_ldap';

const genLogin_with_existLogin = (existLogin_: (login: string) => Promise<boolean>) => async (sn: string, givenName: string) => {
    const { existLogin } = search_ldap;
    (search_ldap as any).existLogin = existLogin_
    const login = await search_ldap.genLogin(sn, givenName);
    (search_ldap as any).existLogin = existLogin;
    return login
};
    

describe('genLogin', () => {
    
    describe('simple', () => {
        const genLogin = genLogin_with_existLogin(_ => Promise.resolve(false));

        function check(sn: string, givenName: string, wantedLogin: string) {
            return () => (
                genLogin(sn, givenName).then(login => {
                    assert.equal(login, wantedLogin);
                })
            );
        }

        it('should use sn', 
           check("rigaux", "", "rigaux"));
        it('should need sn', 
           check('', 'xxx', undefined));
        it('should use both sn & givenName', 
           check('Rigaux', 'Pascal', "prigaux"));
        it('should use givenNames', 
           check('Rigaux', 'Jean-Pierre', "jprigaux"));
        it('should truncate', 
           check('Abcdefghijkl', 'Pascal', "pabcdefghi"));
        it('should remove accents', 
           check('Éxxé', 'Édouard', "eexxe"));
        it('should handle spaces in sn', 
           check('K. Le Guin', 'Ursula', "ukleguin"));
        it('should handle spaces in sn', 
           check('Kroeber Le Guin', 'Ursula', "ukroeberle"));
        it('should handle dash in sn', 
           check('Di-Lö', 'Pascal', "pdilo"));
        it('should remove quotes', 
           check("D'Aa", 'Pascal', "pdaa"));
        it('should remove quotes', 
           check("D' Aa", 'Pascal', "pdaa"));
        it('should remove quotes',
           check("Bouvaist--Rigaux", 'Coline', "cbouvaistr"));

    });

    describe('handle existing', () => {
        let added: Dictionary<boolean> = {};
        const genLogin = genLogin_with_existLogin(s => (
            Promise.resolve(added[s])
        ));
        
        
        function iterate(sn: string, givenName: string, max: number) {
            let iter = (r: string[]): Promise<string[]> => (
                genLogin(sn, givenName).then(login => {
                    if (login && r.length < max) {
                        added[login] = true;
                        return iter(r.concat(login));
                    } else {
                        return r;
                    }
                })
            );
            return iter([]);
        }

        function check(sn: string, givenName: string, max: number, wantedLogins: string[]) {
            return () => (
                iterate(sn, givenName, max).then(logins => {
                    assert.deepEqual(logins, wantedLogins);
                })
            );
        }

        it('multiple no givenName', 
            check('rigaux', '', 12, 
                  _.range(0, 12).map(n => "rigaux" + (n || ''))));

        it('multiple',
           check('rigaux', 'pascal', 10,
                 [ 'prigaux', 'parigaux', 'pasrigaux', 'pascrigaux', 'pascarigau', 'pascalriga',
                   'prigaux1', 'prigaux2', 'prigaux3', 'prigaux4' ]));

        it('multiple with givenNames', 
           check('rigaux', 'jean-pierre', 10,
                 [ 'jprigaux', 'jepirigaux', 'jeapieriga', 'jeanpierri', 'jeanpierrr', 'jeanpierre',
                   'jprigaux1', 'jprigaux2', 'jprigaux3', 'jprigaux4' ]));
    });


    describe('use test ldap', () => {
        before(() => test_ldap.create())
        after(() => test_ldap.stop())   
        
        function check(sn: string, givenName: string, wantedLogin: string) {
            return () => (
                search_ldap.genLogin(sn, givenName).then(login => {
                    assert.equal(login, wantedLogin);
                })
            );
        }

        it('should not use first solution', 
           check('Rigaux', 'Pascal', "parigaux"));

        it('should not use first&second solution', 
           check('Rigaux', 'Ayme', "aymrigaux"));
       
    });
});

describe('homonymes', () => {

    describe('use test ldap', () => {
        before(() => (
            test_ldap.create().then(() => {
                conf.ldap.people.homonymes_restriction = '(eduPersonAffiliation=*)';
                conf.ldap.people.homonymes_preferStudent = s => (s||'').includes('learner')
            })
        ));
        after(() => test_ldap.stop())   

        it('should detect simple homonyme', () => (
            search_ldap.homonymes(
                { sn: 'rigaux', givenName: 'pascal', birthDay: new Date('1975-10-02') } as v).then(l => {
                    console.log(l);
                    assert.equal(l.length, 2);
                    assert.equal(l[0].uid, "prigaux");
                    assert.equal(l[0].score, 30000);
                    assert.equal(l[1].uid, "e10000000");
                    assert.equal(l[1].score, 20100);
                })
        ));
        it('should detect using birthName', () => (
            search_ldap.homonymes(
                { sn: 'Nomdavant', givenName: 'pascal', birthDay: new Date('1975-10-02') } as v).then(l => {
                    assert.equal(l.length, 1);
                    assert.equal(l[0].uid, "prigaux");
                })
        ));
        it('should detect using birthName 2', () => (
            search_ldap.homonymes(
                { sn: 'xxx', birthName: 'Nomdavant', givenName: 'pascal', birthDay: new Date('1975-10-02') } as v).then(l => {
                    assert.equal(l.length, 1);
                    assert.equal(l[0].uid, "prigaux");
                })
        ));
        it('should sort according to preferStudent', () => (
            search_ldap.homonymes(
                { sn: 'rigaux', givenName: 'pascal', birthDay: new Date('1975-10-02'), profilename: '{COMPTEX}learner.xxx' } as v).then(l => {
                    assert.equal(l.length, 2);
                    assert.equal(l[0].uid, "e10000000");
                    assert.equal(l[0].score, 1120100);
                    assert.equal(l[1].uid, "prigaux");
                    assert.equal(l[1].score, 30000);
                })
        ));
        it('should not detect homonyme with birth date a little different', () => (
            search_ldap.homonymes(
                { sn: 'rigaux', givenName: 'ayme', birthDay: new Date('1975-10-02') } as v).then(l => {
                    assert.equal(l.length, 1);
                    assert.equal(l[0].uid, "arigaux");
                    assert.equal(l[0].score, 20000);
                })
        ));
       
    });
});
