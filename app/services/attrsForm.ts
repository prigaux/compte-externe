function AttrsForm_data() {
    return {
      label: conf.attr_labels,
      attrs: <StepAttrsOption> undefined,
      v: <V> undefined,
      errorMessages: {},
      submitted: false,
    };    
}

const AttrsForm_mixin : vuejs.ComponentOption = {

    mounted() {
        Ws.getInScope(this, this.id, this.expectedStep);
    },

    data: AttrsForm_data,

    methods: {
      submit(event) {
          console.log("submit");
          this.submitted = true;
          if (!event.target.checkValidity()) return;
          Ws.set(this.id, this.v).then(resp => {
              if (resp.error === "no_moderators") {
                  alert(conf.error_msg.noModerators(this.v.structureParrainS.name));
                  Helpers.assign(this.v.structureParrainS, { key: null, name: null, description: null });
              } else {
                return this.nextStep(resp);
              }
          });
      },
      reject() {
        Ws.remove(this.id).then(this.nextStep);
      }
    },
};

