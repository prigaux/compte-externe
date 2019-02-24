import { map } from 'lodash';
import client_conf from '../app/src/conf';

function key2name(raw, spec: StepAttrOption) {
    if (spec && spec.oneOf) {
        for (const e of spec.oneOf) {
            if (e.const === raw) return e.title;
        }
    }
    return raw;
}

const format_v = (v: v, attrs) => (
    `<dl>
` +
      map(v, (val, key) => {
          if (key === 'various') return '';
          const opts = { ...client_conf.default_attrs_opts[key], ...attrs[key] };
          return '  <dt>' + (opts && opts.title || key) + '</dt><dd>' + val + '</dd>'
      }).join("\n") + `\n</dl>`
)

const format_various_diff = (diff, attrs) => (
`<table border="1">
  <tr><th>Champ modifié</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
` +
    map(diff, ({ prev, current }, key) => {
        const opts = { ...client_conf.default_attrs_opts[key], ...attrs[key] };
        return '  <tr>' + [opts && opts.title || key, prev || '<i>aucune</i>', current || '<i>supprimée</i>'].map(s => `<td>${s}</td>`).join('') + '</tr>'
    }).join("\n") + `
</table>`
);

const various_proxy = {
    get({ various, attrs }, attr) {        
        return attr === 'diff' ?
            format_various_diff(various[attr], attrs) :
            various[attr];
    }    
}

const v_proxy = {
    get({ v, attrs }, attr) {        
        if (attr === Symbol['toPrimitive']) return _ => format_v(v, attrs);
        return attr === 'various' ? 
            new Proxy({ various: v[attr] || {}, attrs }, various_proxy) :
            key2name(v[attr], attrs[attr]);
    }
}

export default (v: v, attrs: StepAttrsOption = {}) => new Proxy({ v, attrs }, v_proxy);
