import Vue from 'vue';
import axios from 'axios';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import template from '../templates/list.html';
import InitialStep from './InitialStep.vue';

export const ModerateList = Vue.extend({
  name: 'ModerateList',
  template,
  components: { InitialStep },
  data: () => ({
    svs: null,
    initialSteps: undefined,
  }),
  mounted() {
      this.listRec({});
      Ws.initialSteps().then(val => this.initialSteps = val);
  },
  beforeDestroy() {
    if (this.cancelP) this.cancelP.cancel("");
  },
  computed: { 
      svsGroupedByStep() {
         return this.svs ? Helpers.groupBy(this.svs, sv => sv.step) : undefined;
      },
  },
  methods: {
    listRec(params) {
        this.cancelP = axios.CancelToken.source();

        Ws.listInScope(this, params, this.cancelP.token).then(rc => {
            if (rc !== "cancel") {
                this.listRec({ poll: true });
            }
        });
    },
  },
});
