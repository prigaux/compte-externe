'use strict';

const Validate : MyComponentOptions<any> = {
  templateUrl: 'templates/validate.html',
  props: ['id'],
  data() {
      return { finished: false, error: undefined };
  },
  computed: {
     url() { return '/api/comptes/' + this.id; }
  },

  methods: {
    set(v) {
        axios.put(this.url, v).then(r => r.data).then((resp: any) => {
            if (resp && resp.success) {
                this.finished = true;
            }
        }).catch(function (err) {
            console.error(err);
            alert(err);
        });
    },
  },
  mounted() {
    axios.get(this.url).then(r => r.data).then((sv: SVRaw) => {
        if (sv.error) {
            this.error = sv.error;
        } else {
            this.set(sv.v);
            
        }
    }).catch((err) => {
        console.error(err);
        alert(err);
    });
  },
};
