import Vue from "vue";
import * as Croppie from 'croppie';
import 'croppie/croppie.css';

import * as EXIF from 'exif-js';
window['EXIF'] = EXIF; // for Croppie

export default Vue.extend({
      props: [ 'data', 'options' ],
      template: '<div></div>',
      mounted() {
        this.init();
      },
      watch: {
        data: 'setImage',
      },
      methods: {
        init() {
          this.croppie = new Croppie(this.$el, {
            enableExif: true, enableOrientation: true,
            ...this.options.init,
          });
          this.setImage();
        },
        setImage() {
            this.croppie.bind({ url: this.data }).catch(err => {
                this.$emit('error', err);
            });
        },
        rotate(angle) {
          this.croppie.rotate(angle);
        },
        get() {
          return this.croppie.result(this.options.export);
        },
    },
});
