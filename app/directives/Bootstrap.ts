'use strict';

Vue.component("validation-errors", {
    props: ['name', 'validity'],
    template: `
   <transition name="fade">
    <span v-if="!validity_.valid">    
       <span class="help-block">{{validity_.message}}</span>
    </span>
   </transition>
    `,
    computed: {
        validity_() {
            return this.validity && this.validity.submitted && this.validity[this.name] || { valid: true };
        },
    },
});

Vue.component("my-bootstrap-form-group", {
    props: ['name', 'label', 'multi', 'validity', 'hideErrors'],
    template: `
            <div class='form-group' :class="{'has-error': validity && validity.submitted && !validity[name].valid }">
              <label v-if="label" class="col-md-3 control-label" :for="name">{{label}}</label>
              <div :class="subClass">
                  <slot></slot>
                  <validation-errors v-if="!hideErrors && validity" :name="name" :validity="validity"></validation-errors>
              </div>
            </div>
    `,
    computed: {
        subClass() {
            return (this.label || this.multi ? '' : 'col-md-offset-3') + ' ' + (this.multi ? '' : 'col-md-9');
        },
    },
});

