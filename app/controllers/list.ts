'use strict';

const ModerateList : vuejs.ComponentOption = {
  name: 'ModerateList',
  templateUrl: 'templates/list.html',
  data: () => ({
    svs: null,
  }),
  mounted() {
      this.listRec({});
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
  },
};
