'use strict';

const ModerateList : vuejs.ComponentOption = {
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
  computed: { 
      svsGroupedByStep() {
         return this.svs ? Helpers.groupBy(this.svs, sv => sv.step) : undefined;
      },
  },
  methods: {
    listRec(params) {
        Ws.listInScope(this, params).then(() => {
            this.listRec({ poll: true });
        });
    },
    reuse({ uid }) {
        router.push("/reuse/" + uid);
    }
  },
};
