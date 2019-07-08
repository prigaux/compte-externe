'use strict';

import { assert } from '../test_utils';
import checkDisplayName from '../../../shared/validators/displayName';

describe('validators/displayName', () => {

    it("should handle simple cases", () => {
        assert.equal(checkDisplayName("Pascal Rigaux", { sn: 'Rigaux', givenName: 'Pascal' }), undefined);
        assert.equal(checkDisplayName("Pascal Plaquet", { sn: 'Rigaux', birthName: 'Plaquet', givenName: 'Pascal' }), undefined);
        assert.equal(checkDisplayName("Pascal Rémi Rigaux", { sn: 'Rigaux', altGivenName: 'Rémi', givenName: 'Pascal' }), undefined);
        assert.equal(checkDisplayName("Rémi Rigaux", { sn: 'Rigaux', altGivenName: 'Rémi', givenName: 'Pascal' }), undefined);

        assert.equal(checkDisplayName("Pierre Rigaux", { sn: 'Rigaux', givenName: 'Pascal' }), "« pierre » n'est pas autorisé. Autorisé : pascal");
        assert.equal(checkDisplayName("Pascal Dupond", { sn: 'Rigaux', givenName: 'Pascal' }), "« dupond » n'est pas autorisé. Autorisé : rigaux");
        assert.equal(checkDisplayName("Rigaux", { sn: 'Rigaux', givenName: 'Pascal' }), "Le nom annuaire doit comprendre le prénom et le nom");
    });        

    it("should ignore accents", () => {
        assert.equal(checkDisplayName("Rémi Rigaux", { sn: 'Rigaux', givenName: 'Remi' }), undefined);
        assert.equal(checkDisplayName("Remi Rigaux", { sn: 'Rigaux', givenName: 'Rémi' }), undefined);
        assert.equal(checkDisplayName("Pascal Blœdé", { sn: 'Bloede', givenName: 'Pascal' }), undefined);
    });

    it("should allow replacing non-words with different non-words", () => {
        assert.equal(checkDisplayName("René Quentin Rigaux", { sn: 'Rigaux', givenName: 'Rene-Quentin' }), undefined);
        assert.equal(checkDisplayName("René-Quentin Rigaux", { sn: 'Rigaux', givenName: 'Rene Quentin' }), undefined);
    });        

    it("should allow adding spaces in words", () => {
        assert.equal(checkDisplayName("Pascal El Rigaux", { sn: 'Elrigaux', givenName: 'Pascal' }), undefined);
    });

    it("should not allow removing space between giveName and sn", () => {
        assert.equal(checkDisplayName("Pascal FooRigaux", { givenName: "Pascal Foo", altGivenName: "foo", sn: "Rigaux", birthName: 'Plaquet' }), "« foorigaux » n'est pas autorisé. Autorisés : rigaux, plaquet");
    });

    it("should keeping part of sn/givenName", () => {
        assert.equal(checkDisplayName("Charles Rigaux", { sn: 'Rigaux', givenName: 'Charles Henri' }), undefined);

        assert.equal(checkDisplayName("Charles Rigaux", { sn: 'Rigaux', givenName: 'Charles-Henri' }), "« charles » n'est pas autorisé. Autorisé : charleshenri");
    });        

    it("should keeping part of sn/givenName swapped", () => {
        assert.equal(checkDisplayName("Henri Charles Rigaux", { sn: 'Rigaux', givenName: 'Charles Henri' }), undefined);
    });        

    it("should handle long complex names", () => {
        const long = {
            sn: "Le Francois Des Rigaux De La Foo",
            birthName: "De Plaquet",
            givenName: "Pascal",
        };
        assert.equal(checkDisplayName("Pascal des Rigaux", long), undefined);
        assert.equal(checkDisplayName("Pascal de", long), undefined);
        assert.equal(checkDisplayName("Pascal du", long), "« du » n'est pas autorisé. Autorisés : le, francois, des, rigaux, de, la, foo, plaquet");
    });

});

