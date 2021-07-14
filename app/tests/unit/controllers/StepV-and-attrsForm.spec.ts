import * as _ from 'lodash'
import { mount, createLocalVue } from '@vue/test-utils'
//import { mocha_axios_mock, flushPromises } from '../test_utils';
import VueRouter from 'vue-router'
import { assert } from 'chai';
import StepV from '@/controllers/StepV.vue';
import { flushPromises } from '../test_utils';



const mountStepV = ({ attrs, v, v_pre = {}, initialStep = false }) => {
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    localVue.directive('on-submit', _ => {}) // ignore it
    localVue.directive('on-visible', _ => {}) // ignore it
    return mount(StepV, {
        propsData: {
            step: { labels: { title: "Title1<>" } },
            attrs, all_attrs_flat: _.clone(attrs),
            v: _.clone(v), v_orig: _.clone(v), v_pre,
            stepName: 'foo',
            wanted_id: initialStep ? null : 'xxx',
        }, 
        localVue, 
        router: new VueRouter(),
        stubs: { MyModalP: true, Homonyms: true, 'my-bootstrap-form-group': true, 'input-with-validity': true, 'radio-with-validity': true }
    })

}

describe('StepV-and-attrsForm', () => {
    it('should render a minimal test', () => {
        const params = {
            attrs: { attr1: {} }, 
            v: { attr1: 'val1' }, 
            v_pre: {},
        }
        const wrapper = mountStepV(params)
        //
        const html = wrapper.html()
        assert.match(html, /<h2.*>Title1&lt;&gt;<\/h2>/, 'title')
        assert.deepEqual(_.omit(wrapper.find('input-with-validity-stub')?.attributes(), 'validity'), { name: 'attr1', value: 'val1', required: "true", type: "text" });
    })

    it('renders', async () => {
        const choices = {
            default: 'print',
            oneOf: [
                { const: "print" },
                { const: "enroll", merge_patch_parent_properties: {
                    attr1: { readOnly: false, uiHidden: false },
                } },
            ],
        }
        const all_choices = {
            default: 'unchanged',
            oneOf: [
                ...choices.oneOf,
                { const: "unchanged" },
            ],
        }
        const params = {
            attrs: { 
                global_attr1: { readOnly: true, uiHidden: true,
                    if: { optional: false },
                    then: { merge_patch_parent_properties: { choice: all_choices } },
                },
                choice: choices,
                attr1: { readOnly: true, uiHidden: true },
            }, 
            v: { attr1: '', global_attr1: '', choice: '' }, 
            v_pre: {},
        }
        const wrapper = mountStepV(params)
        await flushPromises()
        const vm = wrapper.vm as any
        //
        const html = wrapper.html()
        assert.match(html, /<h2.*>Title1&lt;&gt;<\/h2>/, 'title')
        assert.deepEqual(vm.other_attrs.choice, choices)
        assert.deepEqual(vm.v.choice, 'print')
        assert.equal(wrapper.findAll('input-with-validity-stub').length, 0, "do not display input")

        // simulate merge homonyms sets global_attr1
        vm.v.global_attr1 = 'a'
        await flushPromises()
        assert.deepEqual(vm.other_attrs.choice, all_choices)
        assert.deepEqual(vm.v.choice, 'unchanged') // default changed :-)
        assert.equal(wrapper.findAll('input-with-validity-stub').length, 0, "do not display input")

        // set choice
        vm.v.choice = "enroll"
        await flushPromises()
        assert.deepEqual(_.omit(wrapper.find('input-with-validity-stub')?.attributes(), 'validity'), { name: 'attr1', value: '', required: "true", type: "text" });
    })
})


