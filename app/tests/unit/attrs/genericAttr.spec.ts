import * as _ from 'lodash'
import { mount, createLocalVue, Wrapper } from '@vue/test-utils'
import { flushPromises } from '../test_utils';
import { assert } from 'chai';
import AsyncComputed from 'vue-async-computed';
import genericAttr from '@/attrs/genericAttr.vue';

import '@/directives/validators'

const inputAttrs = (eltWrapper: Wrapper<Vue>) => _.omit(eltWrapper.attributes(), 'validity', 'class')
const inputValue = (inputWrapper: Wrapper<Vue>) => (inputWrapper.element as HTMLInputElement).value
const inputChecked = (inputWrapper: Wrapper<Vue>) => (inputWrapper.element as HTMLInputElement).checked

const mount_test = ({ name, opts, v } : { name: string, opts: StepAttrOptionM<unknown>, v: CommonV }) => {
    const localVue = createLocalVue()
    localVue.use(AsyncComputed)
    return mount(genericAttr, {
        propsData: {
            value: v[name], real_name: name, name, opts, v, stepName: 'foo',
        }, 
        localVue, 
        stubs: { 'my-bootstrap-form-group': true }
    })

}

describe('minimal', async () => {
    it('renders simple input', () => {
        const wrapper = mount_test({ name: "attr1", opts: {}, v: { attr1: "a" } })
        const inputWrapper = wrapper.find('input')
        assert.deepEqual(inputAttrs(inputWrapper), { name: "attr1", required: "required", type: "text" })
        assert.equal(inputValue(inputWrapper), "a")
    })

    it('renders radio', async () => {
        const opts = { oneOf: [ { const: "a", title: "A" }, { const: "b", title: "B" } ] }
        const wrapper = mount_test({ name: "attr1", opts, v: { attr1: undefined } })
        await flushPromises()
        //
        const inputs = wrapper.findAll("input").wrappers
        assert.deepEqual(inputs.map(inputAttrs), [
            { name: "attr1", required: "required", type: "radio", value: "a" },
            { name: "attr1", required: "required", type: "radio", value: "b" },
        ])
        // nothing selected by default
        assert.deepEqual(inputs.map(inputChecked), [false, false])

        // selecting 2nd
        await inputs[1].setChecked()
        assert.deepEqual(inputs.map(inputChecked), [false, true])
    })

    it('renders select', async () => {
        const opts: StepAttrOptionM<unknown> = { uiType: 'select', oneOf: [ { const: "a", title: "A" }, { const: "b", title: "B" } ] }
        const wrapper = mount_test({ name: "attr1", opts, v: { attr1: undefined } })
        await flushPromises()
        //
        const selectWrapper = wrapper.find('select')
        assert.deepEqual(inputAttrs(selectWrapper), { name: "attr1", required: "required" })
        const options = wrapper.findAll("select option").wrappers
        assert.deepEqual(options.map(inputAttrs), [ { value: "a" }, { value: "b" } ])
        // nothing selected by default
        assert.equal(inputValue(selectWrapper), '')

        await options[1].setSelected()
        assert.equal(inputValue(selectWrapper), 'b')
    })

    it('limits oneOf to opts.max', async () => {
        const opts: StepAttrOptionM<unknown> = { max: 2, uiType: 'select', oneOf: [ { const: "1", title: "A" }, { const: "2", title: "B" }, { const: "3", title: "C" } ] }
        const wrapper = mount_test({ name: "attr1", opts, v: { attr1: undefined } })
        await flushPromises()
        const vm = wrapper.vm as any
        //
        assert.deepEqual(vm.oneOf, [ { const: "1", title: "A" }, { const: "2", title: "B" } ])
        // if max changes, choices change:
        opts.max = 1
        assert.deepEqual(vm.oneOf, [ { const: "1", title: "A" } ])
    })
    
})

