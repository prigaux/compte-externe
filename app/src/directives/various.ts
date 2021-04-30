import Vue from "vue";
import conf from '../conf';
import loadScriptOnce from 'load-script-once';
import webcamLivePortrait from './webcamLivePortrait.vue';
import { finallyP } from '../services/helpers';
import { debounce } from 'lodash';

Vue.component('webcamLivePortrait', webcamLivePortrait);

Vue.component('autocomplete-user', {
  template: `<input type="search">`,
  mounted() {
    let select = (_event, ui) => {
        this.$emit("select", ui.item);
    };
    let params = { select, wsParams: { allowInvalidAccounts: true } };
    let searchURL = conf.wsgroupsURL + '/searchUserCAS';

    loadScriptOnce(conf.wsgroupsURL + "/web-widget/autocompleteUser-resources.html.js", (err) => {
        if (err) {
            console.error(err);
        } else {
            window['jQuery'](this.$el)['autocompleteUser'](searchURL, params);
        }
    });
  },
})

Vue.directive('auto-focus', {
    inserted(el : HTMLElement) { 
        el.focus();
    }
})

// emits 'change' event
Vue.component('input-file', {
    template: "<input @change='read' type='file'>",
    methods: {
        read: function (e) {
            this.$emit('change', e.target.files[0] as File);
        },
    },
});

// usage: v-on-submit.prevent="action" where "action" returns a promise
//
// inspired from https://github.com/adamzerner/az.helpers/blob/master/az-helpers/disableDoubleSubmit/disableDoubleSubmit.directive.js
Vue.directive('on-submit', function (el : HTMLElement, binding) {
    const [ eventName, submitButton ] = 
        el.tagName === 'FORM' ? 
            [ 'submit', el.querySelector('[type=submit]') as HTMLInputElement ] :
            [ 'click', el as HTMLInputElement ];

    el['on' + eventName] = function (event) {
        // prevent fast double-click
        if (submitButton.disabled) return;

        submitButton.disabled = true;
        if (binding.modifiers.prevent && event) event.preventDefault();
        
        finallyP(binding.value(event), () => setTimeout(_ => {
            submitButton.disabled = false;            
        }, 500));
    };
})

Vue.directive('magic-aria', function (el: HTMLElement) {
    const placeholder = el.getAttribute('placeholder')
    if (placeholder) el.setAttribute('aria-label', placeholder)
})

Vue.directive('on-visible', function (el : HTMLElement, binding) {
    const callback = binding.value
    if (!callback) return // disabled
    new IntersectionObserver((events) => {
        if (events.some(e => e.isIntersecting)) callback(el)
    }).observe(el)
})

/* it works if one can access DOM inside the iframe: it works if same vhost */
Vue.directive('iframe-auto-height', function (el: HTMLElement) {
    let iframe = el as HTMLIFrameElement
    el.addEventListener('load', function () {
        let prev_height
        function may_set_height() {
            const height = iframe.contentDocument.body.scrollHeight
            if (height && prev_height !== height) {
                //console.log("setting iframe height", height)
                iframe.style.height = (height + 3) + 'px' // a little more to avoid appearing/disappearing scrollbars
                prev_height = height
            }
        }
        may_set_height()
        new MutationObserver(debounce(may_set_height)).observe(
            iframe.contentDocument.body,
            { attributes: true, childList: true, subtree: true }
        )
    })    
})
