<template>
  <my-bootstrap-form-group :name="name" :opts="opts" :validity="validity">
    <div v-if="opts.readOnly">
      <input disabled="disabled" class="form-control" :value="val ? val.title : ''">
    </div>
    <div v-else>
      <typeahead :id="name" :name="name" v-model="val" :options="search" :minChars="3" :formatting="formatting" :formatting_html="formatting_html"
            :required="!opts.optional"
            :placeholder="opts.uiPlaceholder"
            :editable="false" :validity.sync="validity[name]"></typeahead>
    </div>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import * as Ws from '../services/ws';

export default Vue.extend({
    props: ['value', 'name', 'real_name', 'opts', 'v', 'stepName'],
    data() {
        return {
          validity: !this.opts.readOnly && { [this.name]: {} },
          val: undefined,
        };
    },
    asyncComputed: {
        valueS() {
            return this.value && Ws.search(this.stepName, this.real_name || this.name, this.value, 1).then(l => l && l[0])
        },
    },
    watch: {
        valueS(val) {
            this.val = val;
        },
        val(val) {
            console.log("val changed", val);
            if (val) {
                this.$emit('input', val.const);
                if (this.opts.onChange) this.opts.onChange(this.v, val.const, val);
            }
        },
    },
    methods: {
        search(token) {
            return Ws.search(this.stepName, this.real_name || this.name, token, 10);
        },
        formatting(e) { 
            return this.opts.formatting ? this.opts.formatting(e) : e && e.title;
        },
        formatting_html(e) {
            return this.opts.formatting_html ? this.opts.formatting_html(e) : this.formatting(e);
        },
    },
});
</script>
