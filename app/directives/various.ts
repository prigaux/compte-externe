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

angular.module('myApp')

.directive('webcamLivePortrait', function factory() {
  return {
    template: `
    <div style="display: inline-block; position: relative;">
      <div style="height: 0">
        <video style="background: white; margin: 0 auto; display: block;" autoplay></video>
      </div>
      <div ng-style="{ width: width + 'px', height: height + 'px' }" style="position: relative; margin: 0 auto; box-sizing: border-box; border: 2px dashed black;"></div>
    </div>
    `,
    scope: { 'webcamLivePortrait': '=' },
    link: function(scope, element, attrs) {
        let o = scope['webcamLivePortrait'] || {};
        scope['height'] = o.height;
        scope['width'] = o.width;
        let elt = <HTMLVideoElement> element.find("video")[0];
        if (o.height) elt.height = o.height;
        
        let success = (stream) => {
            elt.src = window.URL.createObjectURL(stream);
        };
        let err = (error) => {
            o.error = error;
        };
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(success).catch(err);
        } else if (navigator['webkitGetUserMedia']) {
            navigator['webkitGetUserMedia']({ video: true }, success, err);
        } else {
            err("not handled by your browser");
        }
        o.get = () => may_crop_portrait(toCanvas(elt), o).toDataURL('image/jpeg'); //.replace('data:' + format + ';base64,', '');
   },
  };
})

.directive('autoFocus', function($timeout: ng.ITimeoutService) {
    return {
        link: {
            post: function postLink(scope, elem, attrs) {
                $timeout(function () {
                    elem[0].focus();
                });
            }
        }
    };
});
