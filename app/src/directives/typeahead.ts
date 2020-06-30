import Vue from "vue";
import * as Helpers from '../services/helpers';

/* inspired from https://github.com/pespantelis/vue-typeahead */
const typeaheadComponent = Vue.extend({
    template: `
  <div>
   <div :class="{ 'input-group': loading }">
    <input :id="id" class="form-control" :name="name" v-magic-aria :placeholder="placeholder" v-if="!is_textarea"
           v-model="query" ref="input"
           type="text" autocomplete="off"
           @keydown.down.prevent="down"
           @keydown.up.prevent="up"
           @keydown.enter.prevent="hit"
           @keydown.esc="stopAndClose"
           @blur="stopAndClose"
           @focus="open"
           @input="input_changed">
    <textarea :id="id" class="form-control" :name="name" :placeholder="placeholder" v-else
           v-model="query" ref="input"
           type="text" autocomplete="off" :rows="rows"
           @keydown.down="mayDown"
           @keydown.up="mayUp"
           @keydown.enter="mayHit"
           @keydown.esc="stopAndClose"
           @blur="stopAndClose"
           @click="stopAndClose"
           @focus="open"
           @input="input_changed"></textarea>
    <span class="input-group-addon" style="background: #fff" v-if="loading">
     <span class="glyphicon glyphicon-refresh glyphicon-spinning"></span>
    </span>
   </div>

   <div style="position: relative">
    <ul class="dropdown-menu" :class="{ is_textarea }" style="display: block; top: 0; left: 0" v-show="items.length || noResults && !is_textarea">
      <li v-if="moreResults" class="moreResultsMsg" v-html="moreResultsMsg"></li>
      <li v-if="moreResults" role="separator" class="divider"></li>
      <template v-for="(item, $item) in items">
       <li role="separator" class="divider" v-if="$item > 0 && (is_textarea || item.header)"></li>
       <li role="separator" class="dropdown-header" v-html="item.header" v-if="item.header"></li>
       <li 
         :class="activeClass($item)"
         @click.prevent="hit"
         @mousemove="setActive($item)"
         @mousedown.prevent=""> <!-- do not blur "input" -->
        <a v-html="formatAndHighlight(item)"></a>
       </li>
      </template>
      <li v-if="noResults"><a v-text="noResultsMsg"></a></li>
    </ul>
   </div>

  </div>`,

  props: {
      value: { default: null /* help typescript */ },
      options: { type: [Array, Function] }, // either an Array (that will be filtered by matcher) or a function (String => Promise<T>)
      minChars: { type: Number, default: 0 },
      limit: { type: Number, default: 10 },
      formatting: { type: Function, default: (e) => e }, // function (T => String)
      formatting_html: { type: Function },
      editable: { type: Boolean, default: true },
      required: { type: Boolean, default: false },
      is_textarea: { type: Boolean, default: false },
      name: { type: String },
      id: { type: String },
      placeholder: { type: String },
      rows: { type: Number },
  },

  data () {
    return {
      items: [],
      noResults: false,
      moreResults: false,
      query: (this as any).formatting((this as any).value),
      current: 0,
      loading: false,
      cancel: () => {},
      noResultsMsg: "No results",
    }
  },

  computed: {
    moreResultsMsg() { return "Search is limited." },
  },

  mounted() {
    this.checkValidity(this.value, 'parent');
  },

  watch: {
    value(v) {
        this.query = this.formatting(v);
        this.checkValidity(v, 'parent');
    },
  },

  methods: {
    input_changed() {
        if (this.editable) {
            this.$emit('input', this.query);
        }
        this.checkValidity(this.query, 'input');
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

    checkValidity(v, from : 'input' | 'parent') {
        // "v" is an accepted value
        const valueMissing = v === '' || v === undefined || v === null;        
        const validity = this.required && valueMissing ? { valueMissing } : 
                         from === 'input' && !this.editable && !valueMissing ? { badInput: true } : { valid: true };
        this.emitValidity(validity);
    },

    emitValidity(validity) {
        this.$refs.input.setCustomValidity(validity.valid ? '' : 'err');
        this.$emit('update:validity', validity);        
    },

    matcher(entry : string) {
        return entry.match(new RegExp(this.query, "i"));
    },

    formatAndHighlight(v) {
        let v_ = (this.formatting_html || this.formatting)(v);
        v_ = v_.replace(new RegExp(this.query, "i"), m => `<b>${m}</b>`);
        if (this.is_textarea) v_ = v_.replace(/\n/g, '<br>')
        return v_;
    },

    setOptions(data) {
        this.current = this.is_textarea ? -1 : 0;
        this.items = this.limit ? data.slice(0, this.limit) : data
        this.moreResults = data.length > this.limit
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

    mayHit(event) {
        if (this.items.length && this.current >= 0) {
            event.preventDefault();
            this.hit();
        }
    },
    mayUp(event) {
        if (this.items.length) {
            event.preventDefault();
            this.up();
        }
    },
    mayDown(event) {
        if (this.items.length) {
            event.preventDefault();
            this.down();
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
});

// specialization
Vue.component("typeahead", {
    mixins: [typeaheadComponent],
    data: () => ({
        noResultsMsg: "Aucun résultat",
    }),
    computed: {
        moreResultsMsg() {
            return `Votre recherche est limitée à ${this.limit} résultats.<br>Pour les autres résultats veuillez affiner la recherche.`
        },
    },
    methods: {
        matcher(entry : string) {
            return entry.match(new RegExp(Helpers.escapeRegexp(this.query || ''), "i"));
        },        
    }
});
