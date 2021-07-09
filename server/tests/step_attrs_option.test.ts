import * as _ from 'lodash'
import { assert } from './test_utils';
import * as helpers from '../helpers'
import { merge_v, exportAttrs, export_v, flatten_attrs, selectUserProfile, merge_attrs_overrides, checkAttrs, one_diff, transform_object_items_oneOf_async_to_oneOf } from '../step_attrs_option';
import checkDisplayName from '../../shared/validators/displayName';

const a_or_b : StepAttrOption = { oneOf: [
    { const: "a", merge_patch_parent_properties: { a: {} } },
    { const: "b", merge_patch_parent_properties: { a: { toUserOnly: true }, b: {} } },
] }

const a_then_bc : StepAttrsOption = { a: {
    optional: true, 
    if: { optional: false },
    then: { merge_patch_parent_properties: { 
        b: {},
        c: { readOnly: true }
    } }
} }

describe('exportAttrs', () => {
    it("should work", () => {
        const checkSame = (attrs: Dictionary<any>) => assert.deepEqual(exportAttrs(attrs), attrs);
        checkSame({ sn: {} });
        checkSame({ _foo: { properties: { sn: {} } } });
        assert.deepEqual(exportAttrs({ sn: { readOnly: true, max: 11 } }), { sn: { readOnly: true, optional: true, max: 11 } });
    });
    it("should handle hidden", () => {
        assert.deepEqual(exportAttrs({ sn: { hidden: true } }), {});
        assert.deepEqual(exportAttrs({ _foo: { properties: { sn: { hidden: true } } } }), { _foo: { properties: {} }});
    });
    it("should handle toUserOnly", () => {
        assert.deepEqual(exportAttrs({ sn: { toUserOnly: true } }), { sn: { optional: true, readOnly: true }});
        assert.deepEqual(exportAttrs({ sn: { toUserOnly: true, max: 22 } }), { sn: { optional: true, readOnly: true, max: 22 }});
        assert.deepEqual(exportAttrs({ a_or_b }), { a_or_b: { oneOf: [
            { const: "a", merge_patch_parent_properties: { a: {} } },
            { const: "b", merge_patch_parent_properties: { a: { optional: true, readOnly: true }, b: {} } },
        ] } });
        assert.deepEqual(exportAttrs(a_then_bc), { a: {
            optional: true, 
            if: { optional: false },
            then: { merge_patch_parent_properties: { b: {}, c: { optional: true, readOnly: true } } }
        } });
    });
});

describe('export_v', () => {
    function test(attrs: StepAttrsOption, v: v, wanted_v: v) {
        assert.deepEqual(export_v(attrs, v), wanted_v);
    }
    const v = { sn: "new" } as any;

    it("should export wanted attrs", () => {
        test({ sn: {} }, v, v);
        test({ sn: { toUserOnly: true } }, v, v);
        test({ sn: { readOnly: true } }, v, v);
    });
    it("should hide attrs", () => {
        test({ sn: { hidden: true } }, v, {});
        test({}, v, {});
    });
    it("should handle simple properties", () => {
        const attrs = { _foo: { properties: { sn: {} } } };
        test(attrs, v, v);
    });
    it("should handle oneOf merge_patch_parent_properties", () => {
        const attrs = { duration: { oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" },
        ] } }
        test(attrs, { duration: 2, sn: "Rigaux" }, { duration: 2 });
        test(attrs, { duration: 1, sn: "Rigaux" }, { duration: 1, sn: "Rigaux" });
    });
    it("should handle readOnly oneOf merge_patch_parent_properties", () => {
        const attrs = { duration: { readOnly: true, oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" },
        ] } }
        test(attrs, { duration: 2, sn: "Rigaux" }, { duration: 2 });
        test(attrs, { duration: 1, sn: "Rigaux" }, { duration: 1, sn: "Rigaux" });
    });
    it("should handle oneOf merge_patch_parent_properties with default", () => {
        const attrs = { duration: { default: "1", oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" },
        ] } }
        test(attrs, { duration: 2, sn: "Rigaux" }, { duration: 2 });
        test(attrs, { duration: 1, sn: "Rigaux" }, { duration: 1, sn: "Rigaux" });
        test(attrs, { sn: "Rigaux" }, { sn: "Rigaux" });
    });
    it("should handle oneOf merge_patch_parent_properties different toUserOnly", () => {
        const attrs = { a_or_b }
        test(attrs, { a_or_b: "a", a: "aa", b: "bb" }, { a_or_b: "a", a: "aa" });
        test(attrs, { a_or_b: "b", a: "aa", b: "bb" }, { a_or_b: "b", a: "aa", b: "bb" });
    });
    it("should handle oneOf merge_patch_parent_properties with newRootProperties ignore", () => {
        const attrs: StepAttrsOption = { 
            a_or_b: { oneOf: [
                { const: "a" },
                { const: "b", merge_patch_parent_properties: { sn: {} }, merge_patch_options: { newRootProperties: { ignore: ["foo"] } } }, 
            ] },
        }
        test(attrs, { a_or_b: "b", sn: "Rigaux" }, { a_or_b: "b", sn: "Rigaux" });
        test(attrs, { a_or_b: "a", sn: "Rigaux" }, { a_or_b: "a" });
    });
    it("should handle oneOf merge_patch_parent_properties with newRootProperties ignore", () => {
        const attrs: StepAttrsOption = { 
            duration: { oneOf: [
                { const: "1", 
                    // below won't do anything since "sn" does not already exist
                    merge_patch_parent_properties: { sn: {} }, merge_patch_options: { newRootProperties: "ignore" } }, 
                { const: "2" },
            ] },
        }
        test(attrs, { duration: 2, sn: "Rigaux" }, { duration: 2 });
        test(attrs, { duration: 1, sn: "Rigaux" }, { duration: 1 });
    });
    it("should handle if_then merge_patch_parent_properties", () => {
        test(a_then_bc, { a: "", b: "bb" }, { a: "" });
        test(a_then_bc, { a: "aa", b: "bb" }, { a: "aa", b: "bb" });
    });
    it("should handle ignoreInvalidExistingValue", () => {
        const attrs = (ignoreInvalidExistingValue: boolean) => ({ a: { pattern: 'x', optional: true, ignoreInvalidExistingValue } })
        test(attrs(false), { a: "a" }, { a: "a" })
        test(attrs(true), { a: "a" }, {})
        test(attrs(true), { a: "x" }, { a: "x" })
    });
    it("should handle items properties", () => {
        test({ v_array: { items: { properties: { a: {} } } } }, 
             { v_array: [ { a: "aa", b: "bb" } ] },
             { v_array: [ { a: "aa" } ] })
    })
});

describe('flatten_attrs', () => {
    function test(attrs: StepAttrsOption, v: v, wanted_attrs: StepAttrsOption) {
        assert.deepEqual(flatten_attrs(attrs, v), wanted_attrs);
    }
    it("should work", () => {
        test({ sn: {} }, {}, { sn: {} });
    });
    it("should handle simple properties", () => {
        const attrs = { _foo: { properties: { sn: {} } } };
        test(attrs, {}, { ...attrs, sn: {} });
    });
    it("should handle oneOf merge_patch_parent_properties", () => {
        const attrs = { duration: { oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" },
        ] } };
        test(attrs, { duration: 2 }, { ...attrs });
        test(attrs, { duration: 1 }, { ...attrs, sn: {} });
    });
    it("should handle if_then merge_patch_parent_properties", () => {
        test(a_then_bc, { a: "" }, { ...a_then_bc });
        test(a_then_bc, { a: "aa" }, { ...a_then_bc, b: {}, c: { readOnly: true } });
    });
});

describe('merge_v', () => {
    function test_more(attrs: StepAttrsOption, more_attrs: StepAttrsOption, prev: v, v: v, wanted_v: v) {
        let v_ = merge_v(attrs, more_attrs, prev, v);
        delete v_.various;
        assert.deepEqual(v_, wanted_v);
    }
    
    function test_fail_more(attrs: StepAttrsOption, more_attrs: StepAttrsOption, prev: v, v: v, wanted_err: any) {
        try {
            merge_v(attrs, more_attrs, prev, v);
            assert.fail("should raise error");
        } catch (err) {
            if (_.isRegExp(wanted_err)) {
                if (!wanted_err.test(err)) assert.fail(`expected\n"""${err}""" to match regexp ${wanted_err}`)
            } else {
                assert.deepEqual(err, wanted_err);
            }
        }
    }
    function test(attrs: StepAttrsOption, prev: v, v: v, wanted_v: v) {
        test_more(attrs, {}, prev, v, wanted_v);
    }
    function test_fail(attrs: StepAttrsOption, prev: v, v: v, wanted_err: any) {
        test_fail_more(attrs, {}, prev, v, wanted_err);
    }
    const prev = { sn: "old" } as any;
    const v = { sn: "new" } as any;
    it("should merge from v", () => {
        test({ sn: { optional: true } }, prev, v, v);
    });
    it("should skip not wanted attrs", () => {
        test({}, prev, v, {});
        test({ sn: { optional: true, toUserOnly: true } }, prev, v, {});
    });
    it("should merge from prev", () => {
        test({ sn: { optional: true, hidden: true } }, prev, v, prev);
        test({ sn: { optional: true, readOnly: true } }, prev, v, prev);
    });
    it ("should not validate toUserOnly", () => {
        test({ sn: { toUserOnly: true } }, {}, {}, {});
    });
    it ("should not validate prev", () => {
        test({ sn: { readOnly: true } }, {}, {}, {});
        test({ sn: { hidden: true } }, {}, {}, {});
    });
    it ("should validate required", () => {
        test_fail({ sn: {} }, {}, {}, "constraint !sn.optional failed for undefined");
        test_fail({ sn: {} }, {}, { sn: '' }, "constraint !sn.optional failed for ");
        test_fail({ sn: {} }, prev, {}, "constraint !sn.optional failed for undefined");
        test_fail({ sn: {} }, {}, { sn: null }, "constraint !sn.optional failed for null");
        test({ sn: {} }, prev, v, v);
        test({ startdate: {} }, {}, { startdate: new Date('2017-01-31') }, { startdate: new Date('2017-01-31') });
    });
    it ("should check pattern", () => {
        test({ sn: { pattern: "x" } }, {}, { sn: 'x' }, { sn: 'x' });
        test_fail({ sn: { pattern: "x" } }, {}, { sn: 'X' }, "constraint sn.pattern x failed for X");
    });
    it ("should not check pattern if optional and value is empty", () => {
        test({ sn: { optional: true, pattern: "x" } }, {}, {}, {});
        test({ sn: { optional: true, pattern: "x" } }, {}, { sn: '' }, { sn: '' });
    });
    it ("should check min/max", () => {
        test({ attr1: { min: 2 } }, {}, { attr1: 2 }, { attr1: 2 });
        test_fail({ attr1: { min: 2 } }, {}, { attr1: 1 }, "constraint attr1.min >= 2 failed for 1");
        test({ attr1: { max: 2 } }, {}, { attr1: 2 }, { attr1: 2 });
        test_fail({ attr1: { max: 2 } }, {}, { attr1: 3 }, "constraint attr1.max <= 2 failed for 3");
    });
    it ("should check minDate/maxDate", () => {
        const v = { attr1: helpers.addDays(new Date(), 100) }
        test({ attr1: { minDate: '+99D' } }, {}, v, v);
        test_fail({ attr1: { minDate: '+101D' } }, {}, v, /^constraint attr1[.]minDate >= [+]101D failed/);
        test({ attr1: { maxDate: '+101D' } }, {}, v, v);
        test_fail({ attr1: { maxDate: '+99D' } }, {}, v, /^constraint attr1[.]maxDate <= [+]99D failed/);
    });
    it ("should check array", () => {
        test_fail({ altGivenName: { items: {} } }, {}, {}, 'constraint !altGivenName.optional failed for undefined');
        // @ts-expect-error
        test_fail({ altGivenName: { items: {} } }, {}, { altGivenName: 'x' }, 'constraint altGivenName is array failed for x');
        // @ts-expect-error
        test_fail({ altGivenName: { items: {}, optional: true } }, {}, { altGivenName: 'x' }, 'constraint altGivenName is array failed for x');
        test_fail({ altGivenName: { items: {} } }, {}, { altGivenName: [] }, 'constraint !altGivenName.optional failed for ');
        test({ altGivenName: { items: {}, optional: true } }, {}, {}, {});
        test({ altGivenName: { items: {}, optional: true } }, {}, { altGivenName: [] }, { altGivenName: [] });
        test({ altGivenName: { items: {} } }, {}, { altGivenName: ["x"] }, { altGivenName: ["x"] });
    });
    it ("should check oneOf", () => {
        const attrs = { duration: { oneOf: [ { const: "1" } ] } };
        test(attrs, {}, { duration: 1 }, { duration: 1 });
        test_fail(attrs, {}, { duration: 2 }, "constraint duration.oneOf 1 failed for 2");
    });
    it ("should check simple properties", () => {
        const attrs = { _foo: { toUserOnly: true, properties: { sn: {} } } };
        test(attrs, {}, { sn: "foo" }, { sn: "foo" });
        test(attrs, {}, { sn: "foo", giveName: "bar" }, { sn: "foo" });
        test_fail(attrs, {}, {}, "constraint !sn.optional failed for undefined");
    });
    it ("should check multiple properties", () => {
        const attrs = { _foo: { toUserOnly: true, properties: { 
            sn: {},
            giveName: { optional: true },
        } } };
        test(attrs, {}, { sn: "foo" }, { sn: "foo" });
        test(attrs, {}, { sn: "foo", giveName: "bar" }, { sn: "foo", giveName: "bar" });
        test_fail(attrs, {}, {}, "constraint !sn.optional failed for undefined");
    });
    it ("should handle oneOf merge_patch_parent_properties", () => {
        const attrs = { duration: { oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2" },
        ] } };
        test(attrs, {}, { sn: 'x', duration: 1 }, { duration: 1, sn: 'x' });
        test(attrs, {}, { sn: 'x', duration: 2 }, { duration: 2 }); // sn not allowed, it is removed
        test_fail(attrs, {}, { duration: 1 }, "constraint !sn.optional failed for undefined");
    });
    it ("should handle oneOf merge_patch_parent_properties toUserOnly", () => {
        const attrs = { duration: { oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2", merge_patch_parent_properties: { sn: { toUserOnly: true } } },
        ] } };
        test(attrs, { sn: 'y' }, { sn: 'x', duration: 1 }, { duration: 1, sn: 'x' });
        test(attrs, { sn: 'y' }, { sn: 'x', duration: 2 }, { duration: 2 }); // sn not allowed, it is removed
        test_fail(attrs, { sn: 'y' }, { duration: 1 }, "constraint !sn.optional failed for undefined");
    });
    it ("should handle oneOf merge_patch_parent_properties readOnly", () => {
        const attrs = { duration: { oneOf: [
            { const: "1", merge_patch_parent_properties: { sn: {} } }, 
            { const: "2", merge_patch_parent_properties: { sn: { readOnly: true } } },
        ] } };
        test(attrs, { sn: 'y' }, { sn: 'x', duration: 1 }, { duration: 1, sn: 'x' });
        test(attrs, { sn: 'y' }, { sn: 'x', duration: 2 }, { duration: 2, sn: 'y' });
        test_fail(attrs, { sn: 'y' }, { duration: 1 }, "constraint !sn.optional failed for undefined");
    });
    it ("should handle merge_patch_parent_properties oneOf override", () => {
        const attrs = {
            duration: { oneOf: [
                { const: "1", merge_patch_parent_properties: { profilename: { oneOf: [ { const: "p1" } ] } } }, 
                { const: "2" },
            ] },
            profilename: { oneOf: [ { const: "p2" }] },
        };
        test(attrs, {}, { duration: 1, profilename: "p1" }, { duration: 1, profilename: "p1" });
        test(attrs, {}, { duration: 2, profilename: "p2" }, { duration: 2, profilename: "p2" });
        test_fail(attrs, {}, { duration: 1, profilename: "p2" }, "constraint profilename.oneOf p1 failed for p2");
    });

    it ("should handle if_then merge_patch_parent_properties", () => {
        test(a_then_bc, {}, { a: '' }, { a: '' });
        test(a_then_bc, {}, { a: 'aa', b: 'bb' }, { a: 'aa', b: 'bb' });
        test_fail(a_then_bc, {}, { a: 'aa' }, 'constraint !b.optional failed for undefined');
    });
    it ("should handle if_then merge_patch_parent_properties toUserOnly", () => {
        test(a_then_bc, { c: 'c' }, { a: '', c: 'cc' }, { a: '' });
        test(a_then_bc, { c: 'c' }, { a: 'aa', b: 'bb', c: 'cc' }, { a: 'aa', b: 'bb', c: 'c' });
    });

    it("should check validator", () => {
        const attrs = { displayName: {} };
        const more_attrs= { displayName: { validator: checkDisplayName }};
        const prev = { sn: "Rigaux", givenName: "Pascal" };
        const v_ok = { displayName: "Pascal Rigaux" } as v;

        test_more(attrs, more_attrs, prev, v_ok, v_ok, );
        test_fail_more(attrs, more_attrs, prev, { displayName: 'Foo' }, "Le nom annuaire doit comprendre le prénom et le nom");
    });
    it("should check serverValidator", () => {
        const serverValidator: StepAttrOption["serverValidator"] = (val, _prev, v) => !val && !v.givenName && "either sn or givenName needed"
        const attrs: StepAttrsOption = {
            givenName: { optional: true },
            sn: { optional: true, serverValidator },
        }

        test(attrs, {}, { sn: "Foo" }, { sn: "Foo" })
        test(attrs, {}, { givenName: "Foo" }, { givenName: "Foo" })
        test_fail(attrs, {}, {}, { attrName: "sn", code: 400, error: "either sn or givenName needed" })
    });
    it ("should handle allowUnchangedValue", () => {
        const attrs = { duration: { allowUnchangedValue: true, oneOf: [ { const: "1" } ] } };
        test(attrs, {}, { duration: 1 }, { duration: 1 });
        test_fail(attrs, {}, { duration: 2 }, "constraint duration.oneOf 1 failed for 2");
        test(attrs, { duration: 2 }, { duration: 2 }, { duration: 2 });
    });
    it("should ignore default option", () => {
        test({ sn: { default: "foo", optional: true } }, {}, { sn: "" }, { sn: "" })
        test({ sn: { default: "foo", optional: true, oneOf: [ { const: "foo" }, { const: "" } ] } }, {}, { sn: "" }, { sn: "" })
    })
});

describe('compute_diff', () => {
    function test(attrs: StepAttrsOption, prev: v, current: v, wanted_diff: Dictionary<one_diff>) {
        let v_: v = merge_v(attrs, {}, prev, current);
        assert.deepEqual(v_.various.diff, wanted_diff);
    }

    const attrs_sn = { sn: { optional: true }};
    const attrs_altGivenName = { altGivenName: { optional: true }};

    it("should handle no change", () => {
        test(attrs_sn, { sn: "Rigaux" }, { sn: "Rigaux" }, {});
    });
    it("should handle simple change", () => {
        test(attrs_sn, { sn: "Rigaud" }, { sn: "Rigaux" }, { sn: { prev: "Rigaud", current: "Rigaux" }});
        test({ _foo: { toUserOnly: true, properties: attrs_sn } }, { sn: "Rigaud" }, { sn: "Rigaux" }, { sn: { prev: "Rigaud", current: "Rigaux" }});
    });
    it("should handle simple creation", () => {
        test(attrs_sn, {}, { sn: "Rigaux" }, { sn: { prev: undefined, current: "Rigaux" }});
    });
    it("should handle simple removal", () => {
        test(attrs_sn, { sn: "Rigaux" }, { sn: '' }, { sn: { prev: "Rigaux", current: '' }});
    });
    it("should handle array", () => {
        test(attrs_altGivenName, { altGivenName: ["Rigaux"] }, { altGivenName: ["Rigaux"] }, {});
        test(attrs_altGivenName, {}, { altGivenName: ["Rigaux"] }, { altGivenName: { prev: undefined, current: ['Rigaux'] } });
    });

    it("should ignore non required attrs", () => {
        test({}, { sn: "Rigaux" }, {}, {});
        test({}, {}, { sn: "Rigaux" }, {});
    });
    
});

describe('selectUserProfile', () => {
    const profileA = { profilename: "A", sn: "Foo" };
    const profileB = { profilename: "B", sn: "Bar", givenName: "Boo", supannRoleEntite: ["role1"] };
    it("should handle simple up1Profile", () => {
        const v = { up1Profile: [ profileA ] } as v;
        assert.deepEqual(selectUserProfile(v, 'A'), { ...profileA, ...v });
    });

    it("should handle choose in up1Profile", () => {
        const v = { up1Profile: [ profileA, profileB ] } as v;
        assert.deepEqual(selectUserProfile(v, 'A'), { ...profileA, ...v });
        assert.deepEqual(selectUserProfile(v, 'B'), { ...profileB, ...v });
    });

    it("should merge with non-profiled", () => {
        const v = { pager: "060102030405", up1Profile: [ profileA, profileB ] } as v;
        assert.deepEqual(selectUserProfile(v, 'A'), { ...profileA, ...v });
    });

    it("should not keep other profiled attrs from other profiles", () => {
        const v = { up1Profile: [ profileA, profileB ] } as v;
        assert.deepEqual(selectUserProfile({ ...v, givenName: "Boo" }, 'A'), { ...profileA, ...v });
        assert.deepEqual(selectUserProfile({ ...v, givenName: "Zoo" }, 'A'), { ...profileA, ...v, givenName: "Zoo" });
        assert.deepEqual(selectUserProfile({ ...v, supannRoleEntite: ["role1"] }, 'A'), { ...profileA, ...v, supannRoleEntite: [] });
        assert.deepEqual(selectUserProfile({ ...v, supannRoleEntite: ["role1", "role2"] }, 'A'), { ...profileA, ...v, supannRoleEntite: ["role2"] });
    });
})

describe('merge_attrs_overrides', () => {
    it('should allow adding an attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ sn: {} }, { sn: { description: 'override' } }), 
            { sn: { description: 'override' } }
        );
    })
    it('should allow modifying an attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ sn: { description: 'initial' } }, { sn: { description: 'override' } }), 
            { sn: { description: 'override' } }
        );
    })
    it('should allow modifying an array attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ sn: { oneOf: [ { const: "a" } ] } }, { sn: { oneOf: [ { const: "b" } ] } }), 
            { sn: { oneOf: [ { const: "b" }] } }
        );
    })
    it('should allow removing an attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ sn: {} }, { sn: undefined }), 
            {}
        );
    })

    /* having the same attribute in a different "properties" is undefined behaviour */
    it('should allow adding a properties attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ _foo: { properties: { sn: {} } } }, { _foo: { properties: { sn: { description: 'override' } } } }), 
            { _foo: { properties: { sn: { description: 'override' } } } }
        );
    })
    it('should allow modifying a properties attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ _foo: { properties: { sn: { description: 'initial' } } } }, { _foo: { properties: { sn: { description: 'override' } } } }), 
            { _foo: { properties: { sn: { description: 'override' } } } }
        );
    })
    it('should allow removing a properties attribute', () => {
        assert.deepEqual(
            merge_attrs_overrides({ _foo: { properties: { sn: {} } } }, { _foo: { properties: { sn: undefined } } }),
            { _foo: { properties: {} } }
        );
    })
    
})

describe('checkAttrs', () => {
    describe('mixed mixed readOnly/hidden/normal', () => {
        it('should handle "properties"', () => {
            checkAttrs({ 
                _foo: { properties: { sn: {} } },
                _bar: { properties: { sn: {} } },
             }, 'test1')
             checkAttrs({ 
                _foo: { properties: { sn: { toUserOnly: true } } },
                _bar: { properties: { sn: { readOnly: true } } },
             }, 'test2')
             assert.throws(() => checkAttrs({ 
                _foo: { properties: { sn: {} } },
                _bar: { properties: { sn: { hidden: true } } },
             }, 'test3'))
        })
        it('should handle mppp', () => {
            const then_mppp = { then: { merge_patch_parent_properties: { givenName: {} }}}
            checkAttrs({ sn: then_mppp }, 'test1')
            checkAttrs({ sn: then_mppp, givenName: { uiHidden: true } }, 'test2')
            assert.throws(() => checkAttrs({ sn: then_mppp, givenName: { hidden: true } }, 'test3'))
            assert.throws(() => checkAttrs({ sn: then_mppp, givenName: { readOnly: true } }, 'test4'))
        })
    })
})

describe('transform_object_items_oneOf_async_to_oneOf', () => {
    it('should work', async () => {
        const attrs = (c: StepAttrOption) : StepAttrsOption => ({ v_array: { items: { properties: { a: {}, b: { oneOf: [] }, c } } } })
        const transform = async (v: v) => {
            let attrs_ = attrs({ oneOf_async: async (v, _) => ([{ const: v, title: "t_" + v }]) })
            await transform_object_items_oneOf_async_to_oneOf(attrs_, v)
            return attrs_
        }
        assert.deepEqual(await transform({ v_array: [] }), 
            attrs({ oneOf: [] }))
        assert.deepEqual(await transform({ v_array: [ { c: "c1" } ] }),
            attrs({ oneOf: [ { const: "c1", title: "t_c1" } ] }))
        assert.deepEqual(await transform({ v_array: [ { c: "c1" }, { c: "c2" }, { c: "c1" } ] }),
            attrs({ oneOf: [ { const: "c1", title: "t_c1" }, { const: "c2", title: "t_c2" } ] }))
    })    
})
