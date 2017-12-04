<template>
<div>
        <h5>Résultats de l'importation</h5>
        <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Résultat</th>
                        <th v-for="field in ordered_fields">{{attr_labels[field] || field}}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="vr in imported">
                    <td>
                        <span v-if="vr.success">
                            <span v-if="vr.ignored">Ignoré</span>
                            <span v-else-if="vr.in_moderation"><router-link :to='"/" + vr.step + "/" + vr.id'>Doublon détecté</router-link></span>
                            <span v-else>Ok</span>                            
                        </span>
                        <span v-else>
                            {{vr.error}}
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

export default Vue.extend({
    props: ['imported', 'ordered_fields'],
});
</script>
