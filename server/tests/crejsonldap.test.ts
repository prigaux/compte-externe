import { assert } from './test_utils';
import * as crejsonldap from '../crejsonldap';
import * as actions from '../steps/actions';

const fake_callRaw = (param_resp_s) => {
    crejsonldap.callRaw.fn = (param) => {
        if (!(param in param_resp_s)) {
            assert.fail(param, Object.keys(param_resp_s), undefined, 'member');
        }
        return Promise.resolve(param_resp_s[param]);
    };
};

describe('crejsonldap return value', () => {
    it ("should work", () => {
        const resp = {"action":"ADD","dn":"uid=pascalrigau4,ou=people,dc=univ-paris1,dc=fr","attrs":{"accountStatus":["active"],"uid":["pascalrigau4"]}};
        assert.deepEqual(crejsonldap.extract_attrs(resp), { uid: "pascalrigau4", accountStatus: "active" });
    });
});

describe('modifyAccount', () => {
    it ("should work", () => {
        const sv = { v: { "uid": "prigaux", "displayName": "Pascal Rigaux" } as v };

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"create":false,"id":["uid"],"users":[{"attrs":{"uid":"prigaux","displayName":"Pascal Rigaux"}}]}':
            '{"users":[{"action":"MOD","dn":"uid=prigaux,ou=people,dc=univ-paris1,dc=fr","attrs":{"accountStatus":["active"],"uid":["pascalrigau4"]}}]}',
        });
        
        return actions.modifyAccount(null, sv).then(({ v }) => {
            assert.deepEqual(sv.v, v);
        });
    });

    it ("should handle bad params", () => {
        const sv = { v: { "displayName": "Pascal Rigaux" } as v };

        fake_callRaw({});
        
        assert.throws(() => actions.modifyAccount(null, sv), /modifyAccount needs uid/);
    });
    
    it ("should handle failure", () => {
        const sv = { v: { "uid": "prigaux", "displayName": "Pascal Rigaux" } as v };

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"create":false,"id":["uid"],"users":[{"attrs":{"uid":"prigaux","displayName":"Pascal Rigaux"}}]}':
            '{"err":[{"desc":"All user requests failed","code":"userfail"}],"users":[{"err":[{"code":"noids","desc":"No entry found using ID=uid"}]}]}',
        });
        
        return actions.modifyAccount(null, sv).then(_ => {
            assert.fail("should raise error");
        }).catch(err => {
            assert.deepEqual(err, {"code":"noids","desc":"No entry found using ID=uid"});
        });
    }); 
});

describe('expireAccount', () => {
    it ("should work", () => {
        const sv = { v: { "uid": "prigaux", "profilename": "xxx", "sn": "ignored" } as v };

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"create":false,"id":["uid"],"users":[{"profilename":"xxx","enddate":"19700101","attrs":{"uid":"prigaux"}}]}':
            '{"users":[{"action":"MOD","dn":"uid=prigaux,ou=people,dc=univ-paris1,dc=fr","attrs":{"accountStatus":["active"],"uid":["pascalrigau4"]}}]}',
        });
        
        return actions.expireAccount(null, sv).then(({ v }) => {
            assert.deepEqual(v, { uid: 'prigaux', profilename: 'xxx', enddate: new Date('1970-01-01') } as v);
        });
    });        
});

describe('validateAccount', () => {
    it ("should work", () => {
        const sv = { v: { "sn": "Rigaux", "supannMailPerso": "foo@toto.fr" } as v };

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"action":"validate","id":["uid"],"users":[{"attrs":{"sn":"Rigaux","supannMailPerso":"foo@toto.fr"}}]}':
            '{"users":[{}]}',
        });
        
        return actions.validateAccount(null, sv).then(({ v }) => {
            assert.deepEqual(sv.v, v);
        });
    });
    
    it ("should handle failure", () => {
        const sv = { v: { "sn": "Rigaux", "supannMailPerso": "foo@invalid" } as v };

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"action":"validate","id":["uid"],"users":[{"attrs":{"sn":"Rigaux","supannMailPerso":"foo@invalid"}}]}':
            '{"err":[{"desc":"All user requests failed","code":"userfail"}],"users":[{"err":[{"attr":"supannMailPerso","code":"badval","val":"foo@invalid","desc":"Invalid attribute value"}]}]}',
        });
        
        return actions.validateAccount(null, sv).then(_ => {
            assert.fail("should raise error");
        }).catch(err => {
            assert.deepEqual(err, { code: 'Bad Request', error: 'Valeur foo@invalid non valide' });
        });
    }); 
});

describe('createMayRetryWithoutSupannAliasLogin', () => {
    it ("should work", () => {
        const v_ = { "supannAliasLogin": "prigaux", "sn": "Rigaux", "givenName": "Pascal" } as v;

        fake_callRaw({
            '{"retattrs":["uid","accountStatus"],"create":true,"dupcreate":"ignore","dupmod":"ignore","id":["uid"],"users":[{"attrs":{"supannAliasLogin":"prigaux","sn":"Rigaux","givenName":"Pascal"}}]}':
            '{"users":[{"err":[{"code":"dupval","attr":"supannAliasLogin","desc":"Conflicting entries found","dn":["uid=prigaux,ou=people,dc=univ-paris1,dc=fr"],"val":"prigaux"}]}],"err":[{"code":"userfail","desc":"All user requests failed"}]}',

            '{"retattrs":["uid","accountStatus"],"create":true,"dupcreate":"ignore","dupmod":"ignore","id":["uid"],"users":[{"attrs":{"sn":"Rigaux","givenName":"Pascal"}}]}':
            '{"users":[{"action":"ADD","dn":"uid=pascalrigau4,ou=people,dc=univ-paris1,dc=fr","attrs":{"accountStatus":["active"],"uid":["pascalrigau4"]}}]}',
        });
        
        return crejsonldap.createMayRetryWithoutSupannAliasLogin(v_, { create: true, dupcreate: "ignore", dupmod: "ignore" }).then(subv => {
            assert.equal(subv.uid, "pascalrigau4");
        });
    });
});



