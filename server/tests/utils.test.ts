'use strict';

import { assert } from './test_utils';
import * as utils from '../utils';

describe('deep_extend', () => {
    let check = (in_: Dictionary<any>, in_overrides: Dictionary<any>, wanted: Dictionary<any>) => assert.deepEqual(utils.deep_extend(in_, in_overrides), wanted);

    it ("should work with simple objects", () => {
        check({}, {}, {});
        check({ a: "aa" }, {}, { a: "aa" });
        check({}, { a: 22 }, { a: 22 });
        check({ a: "aa" }, { a: 22 }, { a: 22 });
        check({ a: "aa" }, { b: 22 }, { a: "aa", b: 22 });
    });        

    it ("should allow hiding a property", () => {
        check({ a: "aa" }, { a: undefined }, { a: undefined });
        check({ a: "aa" }, { a: null }, { a: null });
    });        

    it ("should allow handle arrays", () => {
        check({ a: ["aa"] }, { a: ["bb"] }, { a: ["bb"] });
        check({ a: { b: ["aa"] } }, { a: { b: ["bb"] } }, { a: { b: ["bb"] } });
    });        

    it("should work with deep objects", () => {
        check({ 
            a: "foo",
            bb: { bb1: { bb11: "1" } },
        }, { 
            bb: { bb2: { bb22: "2" } },
        }, {
            a: "foo",
            bb: {
                bb1: { bb11: "1" },
                bb2: { bb22: "2" },
            },
        })
    })
});

describe('deep_extend_concat', () => {
    let check = (int1: Dictionary<any>, in2: Dictionary<any>, wanted: Dictionary<any>) => assert.deepEqual(utils.deep_extend_concat(int1, in2), wanted);

    it ("should work with simple objects", () => {
        check({}, {}, {});
        check({ a: "aa" }, {}, { a: "aa" });
        check({}, { a: 22 }, { a: 22 });
        check({ a: "aa" }, { a: 22 }, { a: 22 });
        check({ a: "aa" }, { b: 22 }, { a: "aa", b: 22 });
    });        

    it ("should allow hiding a property", () => {
        check({ a: "aa" }, { a: undefined }, { a: undefined });
        check({ a: "aa" }, { a: null }, { a: null });
    });        

    it ("should allow handle arrays", () => {
        check({ a: ["aa"] }, { a: ["bb"] }, { a: ["aa", "bb"] });
        check({ a: { b: ["aa"] } }, { a: { b: ["bb"] } }, { a: { b: ["aa", "bb"] } });
    });        

    it("should work with deep objects", () => {
        check({ 
            a: "foo",
            bb: { bb1: { bb11: "1" } },
        }, { 
            bb: { bb2: { bb22: "2" } },
        }, {
            a: "foo",
            bb: {
                bb1: { bb11: "1" },
                bb2: { bb22: "2" },
            },
        })
    })
});

