import { map } from 'lodash';
import * as Mustache from 'mustache';
import client_conf from '../shared/conf';

export const to_ul_li = (vals: string[]) => (
    vals.length ? Mustache.render(`
<ul>
{{#vals}}
  <li>{{.}}</li>
{{/vals}}
</ul>
    `, { vals }) : ''
)

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

const pmap = (o, f) => Promise.all(map(o, f))

const _format_attr_name = (key: string, opts: StepAttrOption) => (
    opts?.title || key
)

const format_v = async (v: v, attrs) => (
    `<table>
` +
      (await pmap(v, async (val, key) => {
          if (key === 'various') return '';
          const opts = { ...client_conf.default_attrs_opts[key], ...attrs[key] };
          return '  <tr><td>' + _format_attr_name(key, opts) + '</td><td>' + await key2name(val, opts) + '</td></tr>'
      })).join("\n") + `\n</table>`
)

const format_various_diff = async (diff, attrs) => (
`<table border="1">
  <tr><th>Champ modifié</th><th>Ancienne valeur</th><th>Nouvelle valeur</th></tr>
` +
    (await pmap(diff, async ({ prev, current }, key) => {
        const opts = { ...client_conf.default_attrs_opts[key], ...attrs[key] };
        const tds = [
            _format_attr_name(key, opts),
            prev ? await key2name(prev, opts) : '<i>aucune</i>',
            current ? await key2name(current, opts) : '<i>supprimée</i>',
        ]
        return '  <tr>' + tds.map(s => `<td>${s}</td>`).join('') + '</tr>'
    })).join("\n") + `
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
