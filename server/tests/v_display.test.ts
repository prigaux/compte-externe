import { mapValues } from 'lodash';
import { assert } from './test_utils';
import v_display from '../v_display';

const test = (attrs, v, wanted_v) => {
    const v_ = v_display(v, attrs);
    const v__ = mapValues(wanted_v, (_, k) => v_[k]); // NB: can not use "pick"
    assert.deepEqualP(v__, wanted_v);
}

describe('v_display', () => {

    it('should be identical by default', () => {
        test({}, { sn: "Rigaux" }, { sn: "Rigaux" });
    })

    it('should transform oneOf const into name', () => {
        const attrs = {
            profilename: {
                oneOf: [
                    { const: "a", title: "Aaa" },
                    { const: "b", title: "B bbb" },
                ],
            },
        };
        test(attrs, { profilename: "a" }, { profilename: "Aaa" });
        test(attrs, { profilename: "b" }, { profilename: "B bbb" });
    })

    it('should transform oneOf const integer into name', () => {
        const attrs = {
            duration: {
                oneOf: [
                    { const: 1, title: "Aaa" },
                    { const: 2, title: "B bbb" },
                ],
            },
        };
        test(attrs, { duration: "1" }, { duration: "Aaa" });
        test(attrs, { duration: "2" }, { duration: "B bbb" });
    })

    it('should handle various.diff', async () => {
        const v_ = v_display({ various: { diff: { 
            supannMailPerso: { prev: "foo@bar.com" },
            birthName: { current: "Rigaux" },
            sn: { prev: "Rigaud", current: "Rigaux" },
            birthDay: { prev: new Date('1975-10-02'), current: new Date('2010-10-02') },
            "{SMSU}CG": { prev: false, current: true },
            "{SMSU}foo": { prev: false, current: true },
        } } } as v, {
            "{SMSU}CG": { uiType: 'checkbox', title: "J'autorise", description: "l'envoi de SMS" },
        });
        assert.equal(await v_['various'].diff, 
`<table border="1" class="v-diff">
  <tr><th>Champ</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
  <tr><td>Email personnel</td><td>foo@bar.com</td><td><i>supprimée</i></td></tr>
  <tr><td>Nom de naissance</td><td><i>aucune</i></td><td>Rigaux</td></tr>
  <tr><td>Nom d'usage</td><td>Rigaud</td><td>Rigaux</td></tr>
  <tr><td>Date de naissance</td><td>02/10/1975</td><td>02/10/2010</td></tr>
  <tr><td>J'autorise</td><td></td><td>l'envoi de SMS</td></tr>
  <tr><td>{SMSU}foo</td><td><i>aucune</i></td><td>true</td></tr>
</table>`);
    })

    it('should format v', async () => {
        const v_ = v_display({
            supannMailPerso: "foo@bar.com",
            birthName: "Rigaux",
            sn: "Rigaux",
        } as v, { sn: { title: "SN" }});
        assert.equal(await v_.toString(), 
`<table>
  <tr><td>Email personnel</td><td>foo@bar.com</td></tr>
  <tr><td>Nom de naissance</td><td>Rigaux</td></tr>
  <tr><td>SN</td><td>Rigaux</td></tr>
</table>`);
    })
});