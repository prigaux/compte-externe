import { mapValues } from 'lodash';
import { assert } from './test_utils';
import v_display from '../v_display';

const test = (attrs, v, wanted_v) => {
    const v_ = v_display(v, attrs);
    const v__ = mapValues(wanted_v, (_, k) => v_[k]); // NB: can not use "pick"
    assert.deepEqual(v__, wanted_v);
}

describe('v_display', () => {

    it('should be identical by default', () => {
        test({}, { sn: "Rigaux" }, { sn: "Rigaux" });
    })

    it('should transform choices key into name', () => {
        const attrs = {
            profilename: {
                choices: [
                    { key: "a", name: "Aaa" },
                    { key: "b", name: "B bbb" },
                ],
            },
        };
        test(attrs, { profilename: "a" }, { profilename: "Aaa" });
        test(attrs, { profilename: "b" }, { profilename: "B bbb" });
    })

    it('should handle various.diff', () => {
        const v_ = v_display({ various: { diff: { 
            supannMailPerso: { prev: "foo@bar.com" },
            birthName: { current: "Rigaux" },
            sn: { prev: "Rigaud", current: "Rigaux" },
        } } } as v, {});
        assert.equal(v_['various'].diff, 
`<table border="1">
  <tr><th>Champ modifié</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
  <tr><td>Email personnel</td><td>foo@bar.com</td><td><i>supprimée</i></td></tr>
  <tr><td>Nom de naissance</td><td><i>aucune</i></td><td>Rigaux</td></tr>
  <tr><td>Nom d'usage</td><td>Rigaud</td><td>Rigaux</td></tr>
</table>`);
    })

});