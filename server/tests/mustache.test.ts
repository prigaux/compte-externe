import { assert } from './test_utils';
import * as mustache from 'mustache';
import v_display from '../v_display';
import { resolve_mustache_async_params } from '../mail';
import { setTimeoutPromise } from '../helpers';

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
        
        const v_ = v_display(v, { sn: { oneOf: [ { const: "bar", title: "BAR"} ] } })
        const r = mustache.render("Foo {{v_display.sn}} {{v_display.givenName}}", { v_display: v_ });
        assert.equal(r, "Foo BAR bar2");
    });
    
});

describe('resolve_mustache_async_params + mustache', () => {
    const render = async (template, params) => (
         mustache.render(template, await resolve_mustache_async_params(template, params))
    );

    it("should handle simple async", async () => {
        const v = { foo: "Foo", bar: setTimeoutPromise(1).then(_ => "Bar") }
        assert.equal(await render("Foo:{{v.foo}} Bar:{{v.bar}}", { v }), "Foo:Foo Bar:Bar");
    });

    it("should handle mustache sections", async () => {
        const v = { foo: "Foo" }
        assert.equal(await render("{{#v.foo}}Foo:{{v.foo}}{{/v.foo}}{{#v.bar}}Bar:{{v.bar}}{{/v.bar}}", { v }), "Foo:Foo");
    });

})