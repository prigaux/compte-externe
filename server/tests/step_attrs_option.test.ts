import { assert } from './test_utils';
import { merge_v, exportAttrs, export_v } from '../step_attrs_option';

describe('exportAttrs', () => {
    it("should work", () => {
        assert.deepEqual(exportAttrs({ sn: {} }), { sn: {} });
        assert.deepEqual(exportAttrs({ sn: { readonly: true, max: 11 } }), { sn: { readonly: true, max: 11 } });
    });
    it("should handle hidden", () => {
        assert.deepEqual(exportAttrs({ sn: { hidden: true } }), {});
    });
    it("should handle toUserOnly", () => {
        assert.deepEqual(exportAttrs({ sn: { toUserOnly: true } }), { sn: { optional: true, readonly: true }});
        assert.deepEqual(exportAttrs({ sn: { toUserOnly: true, max: 22 } }), { sn: { optional: true, readonly: true, max: 22 }});
    });
});

describe('export_v', () => {
    function test(attrs, v, wanted_v) {
        assert.deepEqual(export_v(attrs, v), wanted_v);
    }
    const v = { sn: "new" } as any;

    it("should export wanted attrs", () => {
        test({ sn: {} }, v, v);
        test({ sn: { toUserOnly: true } }, v, v);
        test({ sn: { readonly: true } }, v, v);
    });
    it("should hide attrs", () => {
        test({ sn: { hidden: true } }, v, {});
        test({}, v, {});
    });
});

describe('merge_v', () => {
    function test(attrs, prev, v, wanted_v) {
        assert.deepEqual(merge_v(attrs, prev, v), wanted_v);
    }
    
    function test_fail(attrs, prev, v, wanted_err) {
        try {
            merge_v(attrs, prev, v);
            assert.fail("should raise error");
        } catch (err) {
            assert.equal(err, wanted_err);
        }
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
        test({ sn: { optional: true, readonly: true } }, prev, v, prev);
    });
    it ("should not validate toUserOnly", () => {
        test({ sn: { toUserOnly: true } }, {}, {}, {});
    });
    it ("should not validate prev", () => {
        test({ sn: { readonly: true } }, {}, {}, {});
        test({ sn: { hidden: true } }, {}, {}, {});
    });
    it ("should validate required", () => {
        test_fail({ sn: {} }, {}, {}, "constraint !sn.optional failed for undefined");
        test_fail({ sn: {} }, {}, { sn: '' }, "constraint !sn.optional failed for ");
        test_fail({ sn: {} }, prev, {}, "constraint !sn.optional failed for undefined");
        test({ sn: {} }, {}, { sn: null }, { sn: null });
        test({ sn: {} }, prev, v, v);
    });
});

