<template>
<div class="playground">
    <div class="buttons">
        <span v-for="(test) in tests">
            <button class="btn btn-default" :class="{ active: test.test_name === test_name }" @click="set_test(test)">{{test.test_name}}</button>
        </span>
    </div>
  <div class="two-columns">
    <div class="test_data">
        <h2>formData</h2>
        <textarea v-if="!v_html"
                spellcheck="false" v-model="v_string" :disabled="v_has_dates" class="plain-textarea">
        </textarea>
        <pre v-else
                class="language-json" :class="{ err: v_err }" >{{
          }}<code class="language-json" v-html="v_html"></code>{{
          }}<textarea spellcheck="false" v-model="v_string" :disabled="v_has_dates"></textarea>{{
        }}</pre>
        <span v-if="v_has_dates">
            Field above is read-only since it contains dates. Comptex works with Date objects, which is not JSON compatible.
        </span>

        <h2>Pseudo-JSONSchema (<a href="https://github.com/UnivParis1/comptex#attrs>">spec</a>)</h2>
        <pre class="language-json" :class="{ err: attrs_err }" >{{
          }}<code class="language-json" v-html="attrs_html"></code>{{
          }}<textarea spellcheck="false" v-model="attrs_string"></textarea>{{
        }}</pre>
    </div>
    <StepV
        stepName="foo" :step="step"
        :attrs="attrs" :all_attrs_flat="attrs"
        :v="v" :v_orig="{}" :v_pre="{}"
    ></StepV>
  </div>
  <hr>
  Inspired by <a href="https://rjsf-team.github.io/react-jsonschema-form/">react-jsonschema-form playground</a>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import * as _ from 'lodash'
import Prism from 'prismjs'
import 'prismjs/components/prism-json'
import 'prismjs/themes/prism.css'
import StepV from './StepV.vue';
import axios from 'axios';
import MockAdapter from "axios-mock-adapter"

const tests: (Omit<ClientSideSVA, 'stepName'> & { test_name: string })[] = [
    {
        test_name: "Simple",
        step: { labels: { title: "A registration form", okButton: "Submit" } },
        attrs: {
            firstName: { title: "First name", default: "Ursula" },
            lastName: { title: "Last name" },
            telephone: { uiType: "phone", title: "Telephone", optional: true },
        },
        v: { lastName: "Le Guin" },
    },
    {
        test_name: 'Numbers',
        step: { labels: { title: "Number fields & widgets", okButton: "Submit" } },
        attrs: {
            "number": { "title": "Number", "uiType": "number" },
            "integer": { "title": "Integer", "uiType": "integer" },
            "numberEnum": { "title": "Number enum", "oneOf": [ 1, 2, 3 ].map(c => ({ const: ""+c, title: ""+c })) },
            "numberEnumRadio": { uiType: "radio", "title": "Number enum", "oneOf": [ 1, 2, 3 ].map(c => ({ const: ""+c, title: ""+c })) },
        },
        v: { "number": "3.14", "integer": "42", "numberEnum": "2" },
    },
    {
        test_name: 'Date',
        step: { labels: { title: "Date", okButton: "Submit" } },
        attrs: {
            // @ts-expect-error
            native_date: { title: 'Native', "description": "May not work on some browsers, notably Firefox Desktop and IE.", uiType: 'date', minDate: '-50SY', maxDate: '+10EY', uiOptions: { date_todayButton: 'Now' } },
            // @ts-expect-error
            alternative_date: { title: 'Alternative', description: 'These work on most platforms.', uiType: 'dateThreeInputs', minDate: '-50SY', maxDate: '+10EY' },
        },
        v: {},
    },
    {
        test_name: 'Various',
        step: { labels: { title: "Various", okButton: "Submit" } },
        attrs: {
            "phone": { title: "Phone number", uiType: "phone" },
            "frenchMobilePhone": { title: "French mobile phone number", uiType: "frenchMobilePhone" },
            "frenchPostalCode": { title: "French postal code", uiType: "frenchPostalCode" },
            "postalAddress": { title: "Postal address", uiType: "postalAddress" },
        },
        v: { "phone": "+41 66 555 44 33", "frenchMobilePhone": "06 02 03 04 05", "frenchPostalCode": "75018" },
    },
    {
        test_name: 'Password',
        step: { labels: { title: "This form uses custom 'newPassword'", description: "=> displays two passwords and checks password strength & same passwords.", okButton: "Submit" } },
        attrs: {
            password: { title: 'Password', uiType: 'newPassword' },
        },
        v: {},
    },
    {
        test_name: "Arrays",
        step: { labels: { title: "A list of strings", okButton: "Submit" } },
        attrs: { 
            listOfStrings: { "title": "A list of strings", "items": { /*"default": "bazinga" TODO */ }, optional: true },
        },
        v: { listOfStrings: [ "foo", "bar" ] },
    },
    {
        test_name: 'Files',
        step: { labels: { title: "Files", okButton: "Submit" } },
        attrs: {
            file: { title: 'Single file', uiType: 'fileUpload' },
            fileAccept: { title: "Single File with Accept attribute", uiType: 'fileUpload', acceptedMimeTypes: [ 'application/pdf' ] },
        },
        v: {},
    },
    {
        test_name: 'Photo',
        step: { labels: { title: "Photo : file upload or live webcam", okButton: "Submit", description: `<ul>
          <li>File upload: with crop/resize using <a href="https://foliotek.github.io/Croppie/">Croppie</a></li>
          <li>Webcam: If you do not have a webcam, see this <a href="https://github.com/UnivParis1/comptex/blob/master/docs/exemples.md#cabine-photographique">recording</a></li>
        </ul>` } },
        attrs: {
            "photo1": { title: "File upload", uiType: "photoUpload", optional: true },
            "photo2": { title: "Webcam", uiType: "cameraSnapshot", optional: true },
        },
        v: {},
    },
    {
        test_name: 'Dependencies',
        step: { labels: { title: 'Dependencies (if/then, oneOf)', okButton: 'Submit' } },
        attrs: {
            _simple: { uiType: "tab", title: 'Simple', properties: {
                simple_name: { title: 'name'},
                credit_card: { 
                    title: 'credit_card',
                    description: 'If you enter anything here then billing_address will be dynamically added to the form.',
                    optional: true,
                    if: { optional: false },
                    then: {
                        merge_patch_parent_properties: {
                            billing_address: { title: 'billing_address' },
                        },
                    },
                },
            } },
            _conditional: { uiType: "tab", title: 'Conditional', properties: {
                "pets": {
                title: "Do you have any pets?",
                default: "0",
                    oneOf: [
                    { const: "0", title: "No" },
                    { const: "1", title: "Yes: One", merge_patch_parent_properties: {
                        pet_age: { title: "How old is your pet?", uiType: "number" },
                    } },
                    { const: ">1", title: "Yes: More than one", merge_patch_parent_properties: {
                        get_rid: { title: "Do you want to get rid of any?", uiType: "checkbox" },
                    } },
                    ],
                },
            } },
        },
        v: { "simple_name": "Randy" },
    }
]

export default Vue.extend({
    components: { StepV },
    data() {
        return {
            tests,
            ...tests[0],
            v_string: undefined, v_html: undefined, v_err: undefined, v_has_dates: undefined,
            attrs_string: undefined, attrs_html: undefined, attrs_err: undefined,            
        }
    },
    mounted() {
        new MockAdapter(axios).onAny().reply(200);
        this.set_v_string();        
        this.set_attrs_string();        
    },

    watch: {
        v_string(s) { 
            this.v_html = s.length > 1000 ? undefined : Prism.highlight(s, Prism.languages.json, 'json');
            if (!this.v_has_dates) {
                try { this.v = JSON.parse(s); this.v_err = false } catch (e) { this.v_err = true }
            }
        },
        attrs_string(s) { 
            this.attrs_html = Prism.highlight(s, Prism.languages.json, 'json');
            try { this.attrs = JSON.parse(s); this.attrs_err = false } catch (e) { this.attrs_err = true }
        },
        v: { deep: true, handler: 'set_v_string' },
        attrs: { deep: true, handler: 'set_attrs_string' },
    },
    computed: {
    },
    methods: {
        set_v_string() {
            console.log('set_v_string', this.v)
            this.v_string = JSON.stringify(this.v, null, 4)
            this.v_has_dates = Object.values(this.v).some(_.isDate)
        },
        set_attrs_string() {
            this.attrs_string = JSON.stringify(this.attrs, null, 4)
        },
        set_test(test) {
            Object.assign(this, test)
        },
    },
});

</script>

<style scoped>
.playground {
    max-width: initial;
}
.two-columns {
    display: flex;
    flex-wrap: wrap;
    gap: 5rem;
}
.test_data {
    border-right: 1px solid green;
    padding-right: 5rem;
}
.two-columns > div:nth-child(2) {
    flex: 1;
    margin-top: -2em; /* counter hardcoded h2 margin-top 2em */
    min-width: 60rem;
    max-width: 90rem;
}

.buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 4rem;
}

.plain-textarea {
    height: 20rem;
}
.plain-textarea, .language-json {
    min-width: 46rem;
}
.language-json {
    position: relative;
    padding: 0;
}
.language-json textarea {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    border: 0;
    padding: 0;

    color: transparent;
    background: transparent;
    caret-color: #333333;

    overflow: hidden; /* scrollbars make a mess, let pre grow. But sometimes a small scrollbar would like to appear... */
}
.language-json textarea::selection {
    color: #000000A0;
}

.language-json.err {
    border-color: red;
}

</style>