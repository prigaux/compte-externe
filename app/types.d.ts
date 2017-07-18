import { AxiosStatic } from 'axios';

import _Vue, { ComponentOptions as _ComponentOptions } from 'vue';
import _VueRouter from 'vue-router';

declare global {
    const Vue : typeof _Vue
    const VueRouter : typeof _VueRouter
    type Vue = _Vue
    type ComponentOptions<V extends _Vue> = _ComponentOptions<V>;
    type MyComponentOptions<V extends _Vue> = ComponentOptions<V> & { templateUrl: string }
    const axios : AxiosStatic
}


