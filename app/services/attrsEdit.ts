const accentsRange = '\u00C0-\u00FC';
const month2maxDay = [undefined,
        31, 29, 31, 30, 31, 30,
        31, // july
        31, 30, 31, 30, 31];

function attrs_data(vm) {
    let validity = { submitted : false };
    Helpers.eachObject(vm.attrs, (attr) => validity[attr] = {});
    Helpers.eachObject(conf.attr_labels, (attr) => validity[attr] = {});
    return { label: conf.attr_labels, validity };
}

let attrsMixin : vuejs.ComponentOption = {
    props: ['v', 'attrs', 'submitted'],
    model: { prop: 'v', event: 'change' },
    data: function() { return attrs_data(this); },
    watch: {
        submitted(b) {
            this.validity.submitted = b;
        },
        v: {
            deep: false,
            handler(v) {
                console.log("re-emitting", v);
                return this.$emit('change', v);
            },
        },
    },
};

Vue.component('common-attrs', Helpers.templateUrl({
    templateUrl: 'templates/common-attrs.html',
    mixins: [attrsMixin],
    data() {
        return {
            validity: { day: {}, month: {}, year: {} },
            towns: [],
        };
    },
    computed: {
        maxDay() {
            return month2maxDay[this.month] || 31;
        },
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
            var address = Helpers.cast(this.v && this.v.homePostalAddress, HomePostalAddressPrecise);
            if (address) {
                Helpers.frenchPostalCodeToTowns(postalCode).then((towns) => {
                    this.towns = towns;
                    if (towns && towns.length === 1) {
                        address.town = towns[0];
                    }
                });
            }
      },
    },
}));
Vue.component('extern-attrs', Helpers.templateUrl({
    templateUrl: 'templates/extern-attrs.html',
    mixins: [attrsMixin],
    data() {
        return {
            doGet: null,
            structures_search_result: [],
        };
    },
    methods: {
        structures_search(search, loading) {
            loading(true);
            Ws.structures_search(search).then(structures => {
                loading(false);
                this.structures_search_result = structures;
            }).catch(err => {
                loading(false);
                throw err;
            });
        },
    },
}));
Vue.component('barcode-attrs', Helpers.templateUrl({
    templateUrl: 'templates/barcode-attrs.html',
    mixins: [attrsMixin],
    computed: {
        attr_formatting: () => conf.attr_formatting,
    },
}));
Vue.component('password-attrs', Helpers.templateUrl({
    templateUrl: 'templates/password-attrs.html',
    mixins: [attrsMixin],
    data() {
        return {
          userPassword2: null,
        };
    },
    computed: {
      passwordPattern() {
          return "(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z]).{8,}"; 
      },
      error_msg() {
          return conf.error_msg;
      },
    },
}));
