import Vue from 'vue';
import axios from 'axios';
import { router } from '../router';
import * as Helpers from '../services/helpers';
import * as Ws from '../services/ws';
import template from '../templates/list.html';

export const ModerateList = Vue.extend({
  name: 'ModerateList',
  template,
  data: () => ({
    svs: null,
    allow_reuse: undefined,
  }),
  mounted() {
      this.listRec({});
      Ws.allowGet("new/reuse").then(allow_reuse => this.allow_reuse = allow_reuse);
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
    reuse({ uid }) {
        router.push("/reuse/" + uid);
    }
  },
});
