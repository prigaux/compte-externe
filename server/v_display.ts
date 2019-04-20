import { map } from 'lodash';
import client_conf from '../app/src/conf';

function key2name(raw, spec: StepAttrOption) {
    if (spec && spec.oneOf) {
        for (const e of spec.oneOf) {
            // allow integer vs string comparison (useful for "duration")
            if (e.const == raw) return e.title;
        }
    }
    if (spec && spec.oneOf_async) {
        return spec.oneOf_async(raw, 1).then(l => l && l[0].title)
    }
    return raw;
}

const format_v = async (v: v, attrs) => (
    `<dl>
` +
      (await Promise.all(map(v, async (val, key) => {
          if (key === 'various') return '';
          const opts = { ...client_conf.default_attrs_opts[key], ...attrs[key] };
          return '  <dt>' + (opts && opts.title || key) + '</dt><dd>' + await key2name(val, opts) + '</dd>'
      }))).join("\n") + `\n</dl>`
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
        // "toString" is called for most implicit conversions to string (which is what Mustache is doing)
        if (attr === 'toString') return () => format_v(v, attrs);

        return attr === 'various' ? 
            new Proxy({ various: v[attr] || {}, attrs }, various_proxy) :
            key2name(v[attr], attrs[attr]);
    }
}

export default (v: v, attrs: StepAttrsOption = {}) => new Proxy({ v, attrs }, v_proxy);
