import { forIn } from 'lodash';
import { compute_subAttrs_and_handle_default_values as compute } from './sub_and_defaults';
import { V, StepAttrsOption } from './ws';

describe('sub_and_defaults', function() {

    function test(params, wanted) {
        const r = compute(params.attrs, params.prev_defaults, params.v);
        //console.log('attrs:' + JSON.stringify(r.attrs));
        //console.log('v:' + JSON.stringify(params.v));
        if (wanted.attrNames) expect(Object.keys(r.attrs).sort().join(' ')).toEqual(wanted.attrNames);
        forIn(wanted.subAttrs || {}, (opts, k) => expect(r.attrs[k]).toEqual(opts));
        if (wanted.v) expect(params.v).toEqual(wanted.v);
        if (wanted.prev_defaults) expect(r.prev_defaults).toEqual(wanted.prev_defaults);
        params.prev_defaults = r.prev_defaults;
    }

    it('should handle default', () => {
        const attrs = { 
            givenName: {},
            sn: { default: 'a' },
        } as StepAttrsOption;
            
        test({ attrs, v: {} as V },
             { v: { sn: 'a' } });
    });
  
    it('should handle sub', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: {} } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'duration' });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'duration sn' })
    });

    it('should merge sub', () => {
        const attrs = { 
            sn: { pattern: "." },
            duration: { oneOf: [ 
                { const: "1", sub: { sn: { default: "a" } } }, 
                { const: "2" }
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'duration sn' });
        test({ attrs, v: { duration: "1" } as V },
             { subAttrs: { sn: { pattern: ".", default: "a" } }, 
               v: { duration: "1", sn: "a" } })
    });

    it('should handle inner sub', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: {
                oneOf: [
                    { const: "rigaux", sub: {
                        givenName: {},
                    } }
                ]
            } } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "2", sn: "rigaux" } as V };
        test(params, { attrNames: 'duration' });
        params.v['duration'] = "1";
        test(params, { attrNames: 'duration givenName sn' })
    });
    
    it('should handle default', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: { default: "a" } } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'duration', v: { duration: "2" } });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'duration sn', v: { duration: "1", sn: "a" } })
    });

    it('should handle same defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: { default: "a" } } }, 
            { const: "2", sub: { sn: { default: "a" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "a" } });
    });
    
    it('should handle different defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: { default: "a" } } }, 
            { const: "2", sub: { sn: { default: "b" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "b" } });
    });

    it('should not modify existing values with defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: { default: "a" } } }, 
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1", sn: "z" } as V };
        test(params, { v: { duration: "1", sn: "z" } });
    });
    
    it('should not modify user-modified-values with defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", sub: { sn: { default: "a" } } }, 
            { const: "2", sub: { sn: { default: "b" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['sn'] = "z";
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "z" } });
    });

    it('should merge subs', () => {
        const attrs = { 
            givenName: { default: "a", oneOf: [ 
                    { const: "a", sub: { sn: {} } }, 
                    { const: "b", sub: { sn: { uiHidden: true } } },
            ] },
            duration: { oneOf: [ 
                { const: "1", sub: { sn: { default: "a" } } }, 
                { const: "2", sub: { sn: { default: "a" } } }, 
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "1" } as V },
             { subAttrs: { sn: { default: "a" } }, v: { duration: "1", givenName: "a", sn: "a" } });
        test({ attrs, v: { duration: "2" } as V },
             { subAttrs: { sn: { default: "a" } }, v: { duration: "2", givenName: "a", sn: "a" } });
        test({ attrs, v: { duration: "2", givenName: "b" } as V },
             { subAttrs: { sn: { default: "a", uiHidden: true } }, v: { duration: "2", givenName: "b", sn: "a" } });
    });
    
});
