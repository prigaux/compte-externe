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

let attrsMixin : ComponentOptions<any> = {
    props: ['v', 'v_orig', 'attrs', 'submitted'],
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
            countries: conf.countries,
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
}));
Vue.component('extern-attrs', Helpers.templateUrl({
    templateUrl: 'templates/extern-attrs.html',
    mixins: [attrsMixin],
    data() {
        return {
            doGet: null,
        };
    },
    methods: {
        structures_search: Ws.structures_search,
   },
}));
Vue.component('barcode-attrs', Helpers.templateUrl({
    templateUrl: 'templates/barcode-attrs.html',
    mixins: [attrsMixin],
    data() {
        return { cardChoice: undefined };
    },
    mounted() {
        this.cardChoice = this.defaultCardChoice;
    },
    watch: {
        allow_unchanged(allow) {
            if (allow) {
                // homonyme merge can allow_unchanged when it was not before, so use it by default
                this.cardChoice = this.defaultCardChoice;
            }
        },
        cardChoice(choice) {
            switch (choice) {
                case "print":
                case "enroll":
                    this.v.barcode = "";
                    this.v.mifare = "";
                    break;
                case "unchanged":
                    this.v.barcode = this.v_orig.barcode;
                    this.v.mifare = this.v_orig.mifare;
                    break;                
            }
        },
    },
    computed: {
      allow_unchanged() {
        return this.v_orig && this.v_orig.mifare;
      },
      defaultCardChoice() {
        return this.allow_unchanged ? "unchanged" : "print";
      },
      cardChoices() { 
        return {
            print: 'Créer une nouvelle carte', 
            enroll: 'Enroller une carte existante', 
            ...this.allow_unchanged && { unchanged: 'Pas de modification de carte' },
        };
      },
      profilename2descr() {
          let map = {};
          let attr = this.attrs.profilename;
          for (let e of attr.choices) map[e.key] = e.name;
          return map;
      },
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
