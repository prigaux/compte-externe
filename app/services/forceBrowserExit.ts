'use strict';

namespace ForceBrowserExit {

    const cookieName = 'forceBrowserExit';
    
    export function install(triggerUrl, forcedRoute) {
        router.beforeEach((to, from, next) => {
            if (Helpers.getCookie(cookieName)) {
                next(forcedRoute);
            } else {
                if (to.match(triggerUrl)) {
                    console.log("forceBrowserExit!");
                    Helpers.createCookie(cookieName, 'true', 0);
                }
                next();
            }
        });
    }
}
