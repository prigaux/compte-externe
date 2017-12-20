import Vue from "vue";
import conf from '../conf';
import * as Helpers from '../services/helpers';

Vue.component('input-with-validity', {
  template: "<input :name='name' :value='value' :type='type'>",
  props: ['value', 'name', 'type', 'sameAs', 'allowedChars', 'realType', 'pattern', 'min', 'max'],
  data: () => ({ prev: undefined }),
  mounted() {
    let element = this.$el;

    element.setAttribute('id', this.name);
    element.classList.add("form-control");
    this._setPattern();

    element.addEventListener('input', () => {
        this.tellParent();
        this.checkValidity();
        return false;
    });
    this.checkValidity();
  },
  watch: {
    value(v) {
        if (v !== this.$el.value) {
            this.$el.value = v; // do it now to update validity. but do not do it if unchanged otherwise it breaks cursor position for some browsers
            this.checkValidity();
        }
    },
    min(v) { this._attrUpdated('min', v) },
    max(v) { this._attrUpdated('max', v) },
    sameAs(v) { this._attrUpdated('pattern', Helpers.escapeRegexp(v)) },
  },
  methods: {
    tellParent() { 
        this.$emit("input", this.$el.value);
    },
    checkValidity() {
        if (this.allowedChars) this._checkAllowedChars();
        if (this.realType) this._checkRealType();
        let validity = Helpers.copy(this.$el.validity, { allAttrs: true });
        validity.message = this.$el.validationMessage;

        let s = JSON.stringify(validity);
        if (s !== this.prev) {
            this.prev = s;
            this.$emit('update:validity', validity);
        }          
    },
    _attrUpdated(name, v) {
        this.$el.setAttribute(name, v);
        this.checkValidity();
    },
    _setPattern() {
        for (const name of ['pattern', 'min', 'max']) {
            if (this[name]) this.$el.setAttribute(name, this[name]);
        }
        if (this.realType === 'phone') this.$el.setAttribute('pattern', conf.pattern.phone);
        if (this.realType === 'frenchPostalCode') this.$el.setAttribute('pattern', conf.pattern.frenchPostalCode);
    },
    _setCustomMsg(msg) {
        this.$el.setCustomValidity(msg);
    },
    _checkAllowedChars() {
        let errChars = (this.$el.value || '').replace(new RegExp(this.allowedChars, "g"), '');
        this._setCustomMsg(errChars !== '' ? conf.error_msg.forbiddenChars(errChars) : '');
    },
    _checkRealType() {
        let validity = this.$el.validity;
        let msg = '';
        switch (this.realType) {
            case 'phone' :
                if (validity.patternMismatch) msg = conf.error_msg.phone;
                break;
            case 'frenchPostalCode':
                if (validity.patternMismatch) msg = conf.error_msg.frenchPostalCode;
                break;
        }
        this._setCustomMsg(msg);
    }
  },
});

Vue.component('radio-with-validity', {
  template: `
  <span>
    <label class="radio-inline" v-for="(descr, val) in values">
       <input type="radio" :name="name" :value="val" :checked="val == value" @change="onchange" required>
       {{descr}}
    </label>
  </span>`,
  props: ['value', 'name', 'values'],
  mounted() {
    this.checkValidity(this.value);
  },
  watch: {
    value: 'checkValidity',
  },
  methods: {
    onchange(event) {
        let v = event.target.value;
        this.$emit("input", v);
        this.checkValidity(v);
    },
    checkValidity(v) {
        let validity = v ? { valid: true } : { valueMissing: true };
        this.$emit('update:validity', validity);
    },
  },
});

Vue.component('checkbox-with-validity', {
    template: `<input type="checkbox" :name="name" :checked="value" @change="onchange" required>`,
    props: ['value', 'name'],
    mounted() {
      this.checkValidity(this.value);
    },
    watch: {
      value: 'checkValidity',
    },
    methods: {
      onchange(event) {
          let v = event.target.checked;
          this.$emit("input", v);
          this.checkValidity(v);
      },
      checkValidity(v) {
          let validity = v ? { valid: true } : { valueMissing: true };
          this.$emit('update:validity', validity);
      },
    },
});
  
Vue.component('textarea-with-validity', {
  template: `<textarea :value="value" @input="onchange" required></textarea>`,
  props: ['value'],
  mounted() {
    this.checkValidity(this.value);
  },
  watch: {
    value: 'checkValidity',
  },
  methods: {
    onchange(event) {
        let v = event.target.value;
        this.$emit("input", v);
        this.checkValidity(v);
    },
    checkValidity(v) {
        let validity = v ? { valid: true } : { valueMissing: true };
        this.$emit('update:validity', validity);
    },
  },
});
