import { assert } from 'chai';
import { forIn } from 'lodash';
import { compute_mppp_and_handle_default_values as compute } from '@/services/mppp_and_defaults';
import { V, StepAttrsOption } from '@/services/ws';

describe('sub_and_defaults', function() {

    function test(params, wanted) {
        const r = compute(params.attrs, params.prev_defaults, params.v);
        //console.log('attrs:' + JSON.stringify(r.attrs));
        //console.log('v:' + JSON.stringify(params.v));
        if (wanted.attrNames) assert.equal(Object.keys(r.attrs).join(' '), wanted.attrNames);
        forIn(wanted.subAttrs || {}, (opts, k) => assert.deepEqual(r.attrs[k], opts));
        if (wanted.v) assert.deepEqual(params.v, wanted.v);
        if (wanted.current_defaults) assert.deepEqual(r.current_defaults, wanted.prev_defaults);
        params.prev_defaults = r.current_defaults;
    }

    it('should handle default', () => {
        const attrs = { 
            givenName: {},
            sn: { default: 'a' },
        } as StepAttrsOption;
            
        test({ attrs, v: {} as V },
             { v: { sn: 'a' } });
    });
  
    it('should handle properties', () => {
        const attrs = { _foo: { properties: { 
            sn: { default: 'a' },
        } } } as StepAttrsOption;
            
        test({ attrs, v: {} as V },
             { v: { sn: 'a' } });
    });

    it('should handle if then merge_patch_parent_properties', () => {
        const attrs = { duration: {
                optional: true,
                if: { optional: false },
                then: { merge_patch_parent_properties: { sn: {} } },
        } } as StepAttrsOption;
            
        test({ attrs, v: { duration: "" } as V },
             { attrNames: 'duration' })
        test({ attrs, v: { duration: "x" } as V },
             { attrNames: 'duration sn' });
    });

    it('should handle oneOf merge_patch_parent_properties', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'duration' });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'duration sn' })
    });

    it('should merge merge_patch_parent_properties', () => {
        const attrs = { 
            sn: { pattern: "." },
            duration: { oneOf: [ 
                { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
                { const: "2" }
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'sn duration' });
        test({ attrs, v: { duration: "1" } as V },
             { subAttrs: { sn: { pattern: ".", default: "a" } }, 
               v: { duration: "1", sn: "a" } })
    });

    it('should handle merge_patch_options', () => {
        const attrs: StepAttrsOption = { 
            sn: { pattern: "." },
            duration: { oneOf: [ 
                { const: "1", 
                  merge_patch_options: { newRootProperties: 'ignore' },
                  merge_patch_parent_properties: { 
                    sn: { default: "a" },
                    givenName: {},
                } }, 
                { const: "2",
                  merge_patch_parent_properties: {
                    givenName: {},
                } },
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'sn duration givenName' });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'sn duration',
               subAttrs: { sn: { pattern: ".", default: "a" } }, 
               v: { duration: "1", sn: "a" } })
    });

    it('should handle merge_patch_options ignore one only', () => {
        const attrs: StepAttrsOption = { 
            sn: { pattern: "." },
            duration: { oneOf: [ 
                { const: "1", 
                  merge_patch_options: { newRootProperties: { ignore: ['sn'] } },
                  merge_patch_parent_properties: {
                    sn: { default: "a" },
                    givenName: {},
                } }, 
                { const: "2" },
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'sn duration' });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'sn duration givenName',
               subAttrs: { sn: { pattern: ".", default: "a" } }, 
               v: { duration: "1", sn: "a" } })
    });

    it('should handle inner merge_patch_parent_properties', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: {
                oneOf: [
                    { const: "rigaux", merge_patch_parent_properties: {
                        givenName: {},
                    } }
                ]
            } } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "2", sn: "rigaux" } as V };
        test(params, { attrNames: 'duration' });
        params.v['duration'] = "1";
        test(params, { attrNames: 'duration sn givenName' })
    });
    
    it('should handle default', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            { const: "2" }
            ] } } as StepAttrsOption;
            
        test({ attrs, v: { duration: "2" } as V },
             { attrNames: 'duration', v: { duration: "2" } });
        test({ attrs, v: { duration: "1" } as V },
             { attrNames: 'duration sn', v: { duration: "1", sn: "a" } })
    });

    it('should handle same defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            { const: "2", merge_patch_parent_properties: { sn: { default: "a" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "a" } });
    });
    
    it('should handle different defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            { const: "2", merge_patch_parent_properties: { sn: { default: "b" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "b" } });
    });

    it('should not modify existing values with defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1", sn: "z" } as V };
        test(params, { v: { duration: "1", sn: "z" } });
    });
    
    it('should not modify user-modified-values with defaults', () => {
        const attrs = { duration: { oneOf: [ 
            { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            { const: "2", merge_patch_parent_properties: { sn: { default: "b" } }  }
            ] } } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V };
        test(params, { v: { duration: "1", sn: "a" } });
        params.v['sn'] = "z";
        params.v['duration'] = "2";
        test(params, { v: { duration: "2", sn: "z" } });
    });

    it('should handle oneOf merge_patch_parent_properties then default', () => {
        const attrs = { 
            givenName: { oneOf: [ 
                    { const: "a", merge_patch_parent_properties: { sn: { default: "SN" } } }, 
                    { const: "b" },
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { givenName: "a" } as V },
             { v: { givenName: "a", sn: "SN" } });
    });

    it('should handle default then oneOf merge_patch_parent_properties', () => {
        const attrs = { 
            givenName: { default: "a", oneOf: [ 
                    { const: "a", merge_patch_parent_properties: { sn: {} } }, 
                    { const: "b" },
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: {} as V },
             { subAttrs: { sn: {} } });
    });

    it('should handle default then oneOf merge_patch_parent_properties then default', () => {
        const attrs = { 
            givenName: { default: "a", oneOf: [ 
                    { const: "a", merge_patch_parent_properties: { sn: { default: "SN" } } }, 
                    { const: "b" },
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: {} as V },
             { v: { givenName: "a", sn: "SN" } });
    });


    it('should merge oneOf merge_patch_parent_properties', () => {
        const attrs = { 
            givenName: { default: "a", oneOf: [ 
                    { const: "a", merge_patch_parent_properties: { sn: {} } }, 
                    { const: "b", merge_patch_parent_properties: { sn: { uiHidden: true } } },
            ] },
            duration: { oneOf: [ 
                { const: "1", merge_patch_parent_properties: { sn: { default: "a" } } }, 
                { const: "2", merge_patch_parent_properties: { sn: { default: "a" } } }, 
            ] },
        } as StepAttrsOption;
            
        test({ attrs, v: { duration: "1" } as V },
             { subAttrs: { sn: { default: "a" } }, v: { duration: "1", givenName: "a", sn: "a" } });
        test({ attrs, v: { duration: "2" } as V },
             { subAttrs: { sn: { default: "a" } }, v: { duration: "2", givenName: "a", sn: "a" } });
        test({ attrs, v: { duration: "2", givenName: "b" } as V },
             { subAttrs: { sn: { default: "a", uiHidden: true } }, v: { duration: "2", givenName: "b", sn: "a" } });
    });

    it('should merge oneOf merge_patch_parent_properties and update default', () => {
        const attrs = { 
            duration: { oneOf: [ 
                { const: "1", merge_patch_parent_properties: { sn: { default: "sn-a" } }, merge_patch_options: { newRootProperties: 'ignore' } }, 
                { const: "2", merge_patch_parent_properties: { sn: { default: "sn-b" } }, merge_patch_options: { newRootProperties: 'ignore' } }, 
            ] },
            givenName: { default: "a", oneOf: [ 
                    { const: "a", merge_patch_parent_properties: { sn: {} } }, 
                    { const: "b" },
            ] },
        } as StepAttrsOption;
            
        let params = { attrs, v: { duration: "1" } as V }
        test(params,
             { attrNames: "duration givenName sn", subAttrs: { sn: { default: "sn-a" } }, v: { duration: "1", givenName: "a", sn: "sn-a" } });
        params.v["duration"] = "2";
        test(params,
            { attrNames: "duration givenName sn", subAttrs: { sn: { default: "sn-b" } }, v: { duration: "2", givenName: "a", sn: "sn-b" } });
   });

   it('should merge oneOf merge_patch_parent_properties and update title', () => {
    const attrs = { 
        profilename: { oneOf: [
            { const: "1" },
            { const: "2",
              merge_patch_options: { newRootProperties: "ignore" },
              merge_patch_parent_properties: { sn: { title: "sn-2" } } },
        ] },
        _foo: { oneOf: [
            { const: "foo1", merge_patch_parent_properties: { sn: { title: "sn" } } },
        ] },
    } as StepAttrsOption;

    let params = { attrs, v: { profilename: "1", _foo: "foo1" } as V }
    test(params, { subAttrs: { sn: { title: "sn" } } });
    params.v["profilename"] = "2";
    test(params, { subAttrs: { sn: { title: "sn-2" } } });
});


});
