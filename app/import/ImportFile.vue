<template>
    <div v-if="to_import">
        <h5>Prévisualisation de la création d'utilisateurs</h5>
        <div style="max-height: 20rem; overflow-y: scroll;">
            <table class="table table-striped table-bordered">
            <thead>
                <tr>
                    <th v-for="field in to_import.fields">{{attr_labels[field]}}</th>
                </tr>
                <tr style="font-size: x-small">
                        <th v-for="field in to_import.fields">{{field}}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="v in to_import.lines">
                <td v-for="field in to_import.fields">{{v[field].toString()}}</td>
                </tr>
            </tbody>
            </table>
        </div>

        <button class="btn btn-primary" @click.prevent="to_import = null">
                <span class="glyphicon glyphicon-trash"></span>
                Annuler</button>      
    </div>
    <div v-else>
        <form>
            <label class="btn btn-primary">
                <span class="glyphicon glyphicon-import"></span>
                Déposer un fichier
                <input-file style="display: none;" @change="css_import"></input-file>
            </label>
        </form>           
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import * as Ws from '../services/ws';

export default Vue.extend({
    data() {
        return {
            to_import: undefined,
        }
    },
    watch: {
        to_import(val) { this.$emit("change", val) },
    },
    methods: {
        css_import(file: File) {
          Ws.csv2json(file).then(to_import => {
              this.to_import = to_import;
          });
        },
    },
});
</script>
