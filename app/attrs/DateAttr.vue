<template>
  <my-bootstrap-form-group :name="name" :label="attr_labels[name]" :validity="validity">
    <input-with-validity :name="name" v-model="val" type="date"
       :min="opts.min" :max="opts.max" :required="!opts.optional" :validity.sync="validity[name]"></input-with-validity>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";

function init(date) {
    return date && date.toISOString().replace(/T.*/, '');
}

export default Vue.extend({
    props: ['name', 'value', 'opts', 'submitted'],
    data() {
        return {
            validity: { [this.name]: {}, submitted: false },
            val: init(this.value),
        };
    },
    watch: {
        value(date) {
            if (date && date !== this.date) this.val = init(date);
        },
        date(date) {
            this.$emit('input', date);
        },
        submitted(b) {
            this.validity.submitted = b;
        },
    },
    computed: {
        date() {
            return new Date(this.val);
        },
    },
});
</script>
