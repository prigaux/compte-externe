import Vue from 'vue';
import axios from 'axios';
import conf from '../conf';
import { SVRaw } from '../services/ws';
import template from '../templates/validate.html';

export const Validate = Vue.extend({
  template,
  props: ['id'],
  data() {
      return { finished: false, error: undefined };
  },
  computed: {
     url() { return conf.base_pathname + 'api/comptes/' + this.id; }
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
});
