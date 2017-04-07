'use strict';

const Validate : vuejs.ComponentOption = {
  templateUrl: 'templates/validate.html',
  props: ['id'],
  data: { finished: false },
  computed: {
     url() { return '/api/comptes/' + this.id; }
  },

  methods: {
    set(v) {
        axios.put(this.url, v).then(r => r.data).then(function (resp: any) {
            if (resp && resp.success) {
                this.finished = true;
            }
        }).catch(function (err) {
            alert(err);
        });
    },
  },
  mounted() {
    axios.get(this.url).then(r => r.data).then(function (sv: SVRaw) {
        if (sv.error) {
            alert(sv);
        } else {
            this.set(sv.v);
            
        }
    }).catch(function (err) {
        alert(err);
    });
  },
};
