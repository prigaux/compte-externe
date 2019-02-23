<template>
<div>
        <h5>Résultats de l'importation</h5>
        <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Résultat</th>
                        <th v-for="field in ordered_fields">{{default_attrs_title[field] || field}}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="vr in sorted_imported">
                    <td>
                        <span v-if="vr.success">
                            <span v-if="vr.ignored">Ignoré</span>
                            <span v-else-if="vr.in_moderation"><router-link :to='"/" + vr.step + "/" + vr.id'>Doublon détecté</router-link></span>
                            <span v-else>Ok</span>                            
                        </span>
                        <span v-else>
                            {{vr.error}}
                            <br>
                            <router-link target="_blank" :to='retry_v_on_error(vr.v)'>Corriger manuellement</router-link>
                        </span>
                    </td>
                    <td v-for="field in ordered_fields">{{vr.v[field].toString()}}</td>
                    </tr>
                </tbody>
              </table>  

        <button class="btn btn-primary" @click.prevent="$emit('done')">
                Ok</button>      
              
</div>
</template>

<script lang="ts">
import Vue from "vue";
import { sortBy, mapKeys } from 'lodash';

export default Vue.extend({
    props: ['imported', 'ordered_fields'],
    computed: {
        sorted_imported() {
            // display errors first, then moderation, ok, ignored
            return sortBy(this.imported, vr => vr.error ? 0 : vr.in_moderation ? 1 : vr.ignored ? 3 : 2);
        },
    },
    methods: {
        retry_v_on_error(v) {
            return { query: mapKeys(v, (_, k) => `default_${k}`) };
        },
    },
});
</script>
