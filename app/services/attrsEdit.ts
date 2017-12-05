import Vue from "vue";
import * as Ws from '../services/ws';
import MixinAttrs from '../attrs/MixinAttrs.vue';
import PasswordAttrs from '../attrs/PasswordAttrs.vue';
import DateAttr from '../attrs/DateAttr.vue';
import AddressAttr from '../attrs/AddressAttr.vue';
import BarcodeAttrs from '../attrs/BarcodeAttrs.vue';
import jpegPhotoAttr from '../attrs/jpegPhotoAttr.vue';

import template_common_attrs from '../templates/common-attrs.html';
import template_extern_attrs from '../templates/extern-attrs.html';


const accentsRange = '\u00C0-\u00FC';

Vue.component('common-attrs', {
    template: template_common_attrs,
    mixins: [MixinAttrs],
    components: { DateAttr, AddressAttr },
    computed: {
        allowedCharsInNames() {
            return "[A-Za-z" + accentsRange + "'. -]";
        },
        maxYear() {
            return new Date().getUTCFullYear();
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
