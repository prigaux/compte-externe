function key2name(raw, spec: StepAttrOption) {
    if (spec && spec.choices) {
        for (const e of spec.choices) {
            if (e.key === raw) return e.name;
        }
    }
    return raw;
}

const v_proxy = {
    get({ v, attrs }, attr) {
        return key2name(v[attr], attrs[attr]);
    }
}

export default (v: v, attrs: StepAttrsOption) => new Proxy({ v, attrs }, v_proxy);
