import Vue from "vue";
import conf from '../conf';
import { V } from '../services/ws';
import * as Ws from '../services/ws';
import * as Helpers from '../services/helpers'; 
import MixinAttrs from '../attrs/MixinAttrs.vue';
import PasswordAttrs from '../attrs/PasswordAttrs.vue';
import DateAttr from '../attrs/DateAttr.vue';
import BarcodeAttrs from '../attrs/BarcodeAttrs.vue';
import jpegPhotoAttr from '../attrs/jpegPhotoAttr.vue';

import template_common_attrs from '../templates/common-attrs.html';
import template_extern_attrs from '../templates/extern-attrs.html';


const accentsRange = '\u00C0-\u00FC';

Vue.component('common-attrs', {
    template: template_common_attrs,
    mixins: [MixinAttrs],
    components: { DateAttr },
    data() {
        return {
            validity: { day: {}, month: {}, year: {} },
            countries: conf.countries,
            towns: [],
        };
    },
    computed: {
        allowedCharsInNames() {
            return "[A-Za-z" + accentsRange + "'. -]";
        },
        frenchPostalCodeToTowns() {
            return Helpers.frenchPostalCodeToTowns;
        },
        maxYear() {
            return new Date().getUTCFullYear();
        },
    },
    watch: {
      'v.homePostalAddress.postalCode'(postalCode: string) {
            this.towns = [];
            if (!postalCode || postalCode.length < 5) return;
            if (!this.v) return
            let v = this.v as V;
            if (v.homePostalAddress) {
                let address = v.homePostalAddress;
                Helpers.frenchPostalCodeToTowns(postalCode).then((towns) => {
                    this.towns = towns;
                    if (towns && towns.length === 1) {
                        address.town = towns[0];
                    }
                });
            }
      },
    },
});
Vue.component('extern-attrs', {
    template: template_extern_attrs,
    mixins: [MixinAttrs],
    methods: {
        structures_search: Ws.structures_search,
   },
});
Vue.component('jpegPhotoAttr', jpegPhotoAttr);
Vue.component('barcode-attrs', BarcodeAttrs);
Vue.component('password-attrs', PasswordAttrs);
