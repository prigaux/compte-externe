'use strict';

angular.module('myApp').

run(function (conf, forceBrowserExit) {
    if (conf.forceBrowserExit)
	forceBrowserExit(new RegExp("/awaiting-moderation/"), '/browser-exit');
});
