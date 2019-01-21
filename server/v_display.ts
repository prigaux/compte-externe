import { map } from 'lodash';
import client_conf from '../app/conf';

function key2name(raw, spec: StepAttrOption) {
    if (spec && spec.oneOf) {
        for (const e of spec.oneOf) {
            if (e.const === raw) return e.title;
        }
    }
    return raw;
}

const format_various_diff = (diff) => (
`<table border="1">
  <tr><th>Champ modifié</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
` +
    map(diff, ({ prev, current }, key) => {
        const opts = client_conf.default_attrs_opts[key];
        return '  <tr>' + [opts && opts.title || key, prev || '<i>aucune</i>', current || '<i>supprimée</i>'].map(s => `<td>${s}</td>`).join('') + '</tr>'
    }).join("\n") + `
</table>`
);

const various_proxy = {
    get(v, attr) {        
        return attr === 'diff' ?
            format_various_diff(v[attr]) :
            v[attr];
    }    
}

const v_proxy = {
    get({ v, attrs }, attr) {        
        return attr === 'various' ? 
            new Proxy(v[attr] || {}, various_proxy) :
            key2name(v[attr], attrs[attr]);
    }
}

export default (v: v, attrs: StepAttrsOption) => new Proxy({ v, attrs }, v_proxy);
