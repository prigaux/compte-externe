import Vue from "vue";
import conf from '../conf';
import webcamLivePortrait from './webcamLivePortrait.vue';

Vue.component('webcamLivePortrait', webcamLivePortrait);

Vue.component('autocomplete-user', {
  template: `<input type="search">`,
  mounted() {
    let select = (_event, ui) => {
        this.$emit("select", ui.item);
    };
    let params = { select, wsParams: { allowInvalidAccounts: true } };
    let searchURL = conf.wsgroupsURL + '/searchUserCAS';
    window['jQuery'](this.$el)['autocompleteUser'](searchURL, params);
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
