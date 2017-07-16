/* inspired from https://github.com/pespantelis/vue-typeahead */

let typeaheadComponent = {
    template: `
  <div>
   <div :class="{ 'input-group': loading }">
    <input :id="id" class="form-control" :name="name" :placeholder="placeholder"
           v-model="query"
           type="text" autocomplete="off"
           @keydown.down.prevent="down"
           @keydown.up.prevent="up"
           @keydown.enter.prevent="hit"
           @keydown.esc="stopAndClose"
           @blur="stopAndClose"
           @focus="open"
           @input="input_changed">
    <span class="input-group-addon" style="background: #fff" v-if="loading">
     <span class="glyphicon glyphicon-refresh glyphicon-spinning"></span>
    </span>
   </div>

   <div style="position: relative">
    <ul class="dropdown-menu" style="display: block; top: 0; left: 0" v-show="items.length || noResults">
      <li v-for="(item, $item) in items" 
         :class="activeClass($item)"
         @click.prevent="hit"
         @mousemove="setActive($item)"
         @mousedown.prevent=""> <!-- do not blur "input" -->
        <a v-text="formatting(item)"></a>
      </li>
      <li v-if="noResults"><a v-text="noResultsMsg"></a></li>
    </ul>
   </div>

  </div>`,

  props: {
      value: {},
      options: { type: [Array, Function] }, // either an Array (that will be filtered by matcher) or a function (String => Promise<T>)
      minChars: { type: Number, default: 0 },
      limit: { type: Number, default: 10 },
      formatting: { type: Function, default: (e) => e }, // function (T => String)
      editable: { type: Boolean, default: true },
      required: { type: Boolean, default: false },
      name: { type: String },
      id: { type: String },
      placeholder: { type: String },
  },

  data () {
    return {
      items: [],
      noResults: false,
      query: this.value,
      current: 0,
      loading: false,
      cancel: () => {},
      noResultsMsg: "No results",
    }
  },

  mounted() {
    this.checkValidity(this.query);
  },

  watch: {
    value(v) {
        this.query = this.formatting(v);
        this.checkValidity(v);
    },
  },

  methods: {
    input_changed() {
        if (this.editable) {
            this.$emit('input', this.query);
            this.checkValidity(this.query);
        } else {
            this.emitValidity({ valueMissing: true });
        }
        this.open();
    },

    open() {
      this.cancel()

      if (this.minChars && (!this.query || this.query.length < this.minChars)) {
        this.stopAndClose()
        return
      }

      if (!this.options) {
          return;
      }
      if (typeof this.options !== "function") {
        this.setOptions(this.options.filter(this.matcher));
        return;
      }

      this.loading = true

      Promise.race([
          new Promise((resolve) => this.cancel = resolve),
          this.options(this.query),
      ]).then((data) => {
          if (!data) return; // canceled
          this.setOptions(data)
      })
    },

    checkValidity(v) {
        if (this.required || !this.editable) this.emitValidity(v === '' ? { valueMissing: true } : { valid: true });
    },

    emitValidity(validity) {
        this.$emit('update:validity', validity);        
    },

    matcher(entry : string) {
        return entry.match(new RegExp(this.query, "i"));
    },

    setOptions(data) {
        this.current = 0
        this.items = this.limit ? data.slice(0, this.limit) : data
        this.noResults = this.items.length === 0
        this.loading = false
    },

    stopAndClose() {
      this.cancel()
      this.items = []
      this.noResults = false
      this.loading = false
    },

    setActive (index) {
      this.current = index
    },

    activeClass (index) {
      return {
        active: this.current === index
      }
    },

    hit () {
        let chosen = this.items[this.current];
        this.query = this.formatting(chosen);
        this.$emit('input', chosen);
        if (!this.editable) {
            this.emitValidity({ valid : true });
        }
        this.stopAndClose();
    },

    up () {
      this.current--
      if (this.current < 0) {
        this.current = this.items.length - 1; // wrap
      }
    },

    down () {
      this.current++
      if (this.current >= this.items.length) {
        this.current = 0; // wrap
      }
    },

  }
};

// specialization
Vue.component("typeahead", {
    mixins: [typeaheadComponent],
    data: () => ({
        noResultsMsg: "Aucun résultat",
    }),
    methods: {
        matcher(entry : string) {
            return entry.match(new RegExp(Helpers.escapeRegexp(this.query), "i"));
        },        
    }
});