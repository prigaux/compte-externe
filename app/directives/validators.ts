Vue.component('input-with-validity', {
  template: "<input :name='name' :value='value' :type='type'>",
  props: ['value', 'name', 'type', 'sameAs', 'allowedChars', 'realType'],
  data: () => ({ prev: undefined }),
  mounted() {
    let element = this.$el;

    element.setAttribute('id', this.name);
    if (this.type !== 'radio') element.classList.add("form-control");
    this._setPattern(this);

    element.addEventListener(this.type === 'radio' ? 'change' : 'input', () => {
        this.tellParent();
        this.checkValidity();
        return false;
    });
    this.checkValidity();
  },
  watch: {
    value(v) {
        this.$el.value = v; // do it now to update validity
        this.checkValidity();
    },
    sameAs(v) {
        this.$el.setAttribute('pattern', Helpers.escapeRegexp(v));
        this.checkValidity();
    },
  },
  methods: {
    tellParent() { 
        this.$emit("input", this.$el.value);
    },
    checkValidity() {
        if (this.allowedChars) this._checkAllowedChars();
        if (this.realType) this._checkRealType();
        let validity = Helpers.copy(this.$el.validity);
        validity.message = this.$el.validationMessage;

        let s = JSON.stringify(validity);
        if (s !== this.prev) {
            this.prev = s;
            this.$emit('validity', validity);
        }          
    },
    _setPattern() {
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

