<template>
<div v-if="v_array.length">
    <a class="btn btn-default export" @click="export_csv" href="#" download="comptes.csv" v-if="opts.uiOptions && opts.uiOptions.object_items_export_csv">
        <span class="glyphicon glyphicon-export"></span>
        Exporter
    </a>

  <div class="table-responsive">
    <table class="table table-striped">
    <tbody>
        <tr>
            <th v-for="(opts, attrName) in attrs">{{opts.title}}</th>
        </tr>
        <tr v-for="v of v_array">
            <td v-for="(opts, attrName) in attrs" :class="'oneAttr-' + attrName">
                <span>{{formatValue(v[attrName], opts)}}</span>
                <component :is="attr_templates[attrName]" :v="v" v-if="attr_templates[attrName]"></component>
            </td>
        </tr>
    </tbody>
    </table>
  </div>
</div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapValues, omitBy } from 'lodash'
import { formatValue } from "../../../shared/v_utils";
import * as Helpers from '../services/helpers';

export default Vue.extend({
    props: ['v_array', 'opts'],
    data() {
        const attrs = omitBy(this.opts.items.properties, (opts) => opts.uiHidden)
        return {
            attrs,
            attr_templates: mapValues(attrs, (opts, _) => (
                opts.description && Vue.extend({ props: ['v'], template: "<div>" + opts.description + "</div>" })
            ))
        }
    },
    methods: {
        formatValue,
        export_csv(event) {
            const csv = Helpers.to_csv(this.v_array, this.attrs)
            event.target.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
        },
    },
})
</script>

