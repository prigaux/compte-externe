'use strict';

import _ = require('lodash');
import { require_fresh, assert } from './test_utils';
import test_ldap = require('./test_ldap');

// get module types:
import __search_ldap__ = require('../search_ldap');
type search_ldap = typeof __search_ldap__;


describe('genLogin', () => {
    
    describe('simple', () => {
        let search_ldap: search_ldap = require_fresh('../search_ldap');
        search_ldap.existLogin = () => Promise.resolve(false);
        
        function check(sn: string, givenName: string, wantedLogin: string) {
            return () => (
                search_ldap.genLogin(sn, givenName).then(login => {
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
        let search_ldap: search_ldap = require_fresh('../search_ldap');
        let added = {};
        search_ldap.existLogin = s => (
            Promise.resolve(added[s])
        );
        
        function iterate(sn: string, givenName: string, max: number): Promise<string[]> {
            let iter = r => (
                search_ldap.genLogin(sn, givenName).then(login => {
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
        let search_ldap: search_ldap;
        before(() => (
            test_ldap.create().then(() => {
                search_ldap = require_fresh('../search_ldap');
            })
        ));
        
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
        let search_ldap: search_ldap;
        before(() => (
            test_ldap.create().then(({ conf }) => {
                conf.ldap.people.homonymes_restriction = '(&(eduPersonAffiliation=*)(!(eduPersonAffiliation=student)))';
                search_ldap = require_fresh('../search_ldap');
            })
        ));

        it('should detect simple homonyme', () => (
            search_ldap.homonymes(
                ['rigaux'], ['pascal'], new Date('1975-10-02'), undefined,
                ['uid', 'birthDay']).then(l => {
                    assert.equal(l.length, 1);
                    assert.equal(l[0].uid, "prigaux");
                    assert.equal(l[0].score, 3);
                })
        ));
        it('should detect homonyme with birth date a little different', () => (
            search_ldap.homonymes(
                ['rigaux'], ['ayme'], new Date('1975-10-02'), undefined,
                ['uid', 'birthDay']).then(l => {
                    assert.equal(l.length, 2);
                    assert.equal(l[0].uid, "arigaux");
                    assert.equal(l[0].score, 3);
                    assert.equal(l[1].uid, "ayrigaux");
                    assert.equal(l[1].score, 1);
                })
        ));
       
    });
});
