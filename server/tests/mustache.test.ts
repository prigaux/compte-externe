import { assert } from './test_utils';
import * as mustache from 'mustache';
import v_display from '../v_display';

describe('Mustache', () => {
    it("should handle fields", () => {
        const v = { bar: "Bar" };
        const r = mustache.render("Foo {{v.bar}}", { v });
        assert.equal(r, "Foo Bar");
    });

    it("should work with Proxy", () => {
        const v = { foo: "bar" };
        
        const v_ = new Proxy(v, {
            get(that, expr) { return that[expr].toUpperCase(); }
        });      
        const r = mustache.render("Foo {{v_.foo}}", { v_ });
        assert.equal(r, "Foo BAR");
    });

    it("should work with v_display", () => {
        const v = { sn: "bar", givenName: "bar2" } as v;
        
        const v_ = v_display(v, { sn: { oneOf: [ { key: "bar", name: "BAR"} ] } })
        const r = mustache.render("Foo {{v_display.sn}} {{v_display.givenName}}", { v_display: v_ });
        assert.equal(r, "Foo BAR bar2");
    });
    
});
