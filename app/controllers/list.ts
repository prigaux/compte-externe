'use strict';

const ModerateList : MyComponentOptions<any> = {
  name: 'ModerateList',
  templateUrl: 'templates/list.html',
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
};
