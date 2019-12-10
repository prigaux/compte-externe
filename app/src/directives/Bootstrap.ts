import Vue from "vue";

Vue.component("validation-errors", {
    props: ['name', 'validity', 'custom_message'],
    template: `
   <transition name="fade">
    <span v-if="!validity_.valid">    
       <span class="help-block">{{custom_message || validity_.message}}</span>
    </span>
   </transition>
    `,
    computed: {
        validity_() {
            return this.validity && this.validity.submitted && this.validity[this.name] || { valid: true };
        },
    },
});

Vue.component("mytooltip", {
    props: [ "text", "glyphicon" ],
    template: `
        <div class="mytooltip" v-if="text">
            <span class="glyphicon" :class="glyphicon"></span>
            <div class="mytooltip-popup"><span>
                <span class="mytooltip-text">
                    {{text}}
                </span>
                <span class="mytooltip-arrow"></span>
            </span></div>
        </div>`
})

Vue.component("my-label-tooltips", {
    props: [ "labels" ],
    template: `
        <span v-if="labels">
            <mytooltip :text="labels && labels.tooltip" glyphicon="glyphicon-question-sign"></mytooltip>
            <mytooltip :text="labels && labels.warning" glyphicon="glyphicon-warning-sign"></mytooltip>
        </span>
    `,
})

Vue.component("nowrap-after-text", {
    props: ['text'],
    template: `
        <span>
          {{text_.before}}
          <span style="white-space: nowrap; display: inline-block">
            {{text_.last_word}}
            <slot></slot>
          </span>
        </span>
    `,
    computed: {
        text_() {
            const m = (this.text || '').match(/(.*) (.*)/);
            return { before: m ? m[1] : '', last_word: m ? m[2] : this.text }
        },
    },
})

Vue.component("my-bootstrap-form-group", {
    props: ['name', 'label', 'multi', 'validity', 'hideErrors', 'labels', 'label_rowspan'],
    template: `
            <div class='form-group' :class="{'has-error': validity && validity.submitted && !validity[name].valid }">
              <label v-if="label" class="col-md-3 control-label" :for="name" :class="{ label_rowspan }">
                <nowrap-after-text :text="label">
                    <my-label-tooltips :labels="labels"></my-label-tooltips>
                </nowrap-after-text>
              </label>
              <div :class="subClass">
                  <slot></slot>
                  <validation-errors v-if="!hideErrors && validity" :name="name" :validity="validity" :custom_message="labels && labels.advice"></validation-errors>
              </div>
            </div>
    `,
    computed: {
        subClass() {
            return (this.label || this.multi ? '' : 'col-md-offset-3') + ' ' + (this.multi ? '' : 'col-md-9');
        },
    },
});

