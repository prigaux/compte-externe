'use strict';

function toCanvas(video_elt) {
    let canvas = document.createElement("canvas");
    canvas.width = video_elt.clientWidth;
    canvas.height = video_elt.clientHeight;
    canvas.getContext("2d").drawImage(video_elt, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function may_crop_portrait(canvas, { width, height }) {
    let real_width = width * (canvas.height / height);
    let width_offset = (canvas.width - real_width) / 2;
    if (width_offset <= 0) return canvas;
    
    let c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    c.getContext("2d").drawImage(canvas, width_offset, 0, real_width, canvas.height, 0, 0, width, height);
    return c;
}


Vue.component('webcamLivePortrait', {
    template: `
    <div style="display: inline-block; position: relative;">
      <div style="height: 0">
        <video ref="video" style="background: white; margin: 0 auto; display: block;" autoplay></video>
      </div>
      <div :style="{ width: width + 'px', height: height + 'px' }" style="position: relative; margin: 0 auto; box-sizing: border-box; border: 2px dashed black;"></div>
    </div>
    `,
    props: ['width', 'height', 'doget'],
    mounted() {
        let elt = this.$refs.video;
        
        if (this.height) elt.height = this.height;
        
        let success = (stream) => {
            elt.src = window.URL.createObjectURL(stream);
        };
        let err = (error) => {
            this.$emit('error', error)
        };
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(success).catch(err);
        } else if (navigator['webkitGetUserMedia']) {
            navigator['webkitGetUserMedia']({ video: true }, success, err);
        } else {
            err("not handled by your browser");
        }
   },
   watch: {
       doget() {
           this.$emit('image', may_crop_portrait(toCanvas(this.$refs.video), this).toDataURL('image/jpeg'));
       },
   },
});

Vue.component('autocomplete-user', {
  template: `<input type="search">`,
  mounted() {
    let select = (_event, ui) => {
        this.$emit("select", ui.item);
    };
    let params = { select, wsParams: { allowInvalidAccounts: true } };
    let searchURL = conf.wsgroupsURL + '/searchUserCAS';
    window['jQuery'](this.$el)['autocompleteUser'](searchURL, params);
  },
})

Vue.directive('auto-focus', {
    inserted(el : HTMLElement) { 
        el.focus();
    }
})
