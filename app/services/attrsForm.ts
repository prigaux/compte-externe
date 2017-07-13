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
        Ws.getInScope(this, this.id, this.expectedStep).then(() => {
            if (this.v.noInteraction) this.send();
        });
    },

    data: AttrsForm_data,

    methods: {
      submit(event) {
          console.log("submit");
          this.submitted = true;
          if (!event.target.checkValidity()) return;
          this.send();
      },
      send() {
          Ws.set(this.id, this.v).then(resp => {
              if (resp.error === "no_moderators") {
                  alert(conf.error_msg.noModerators(this.v.structureParrainS.name));
                  this.v.structureParrainS = undefined;
              } else if (resp.error) {
                  alert(resp.error);
              } else {
                return this.nextStep(resp);
              }
          });
      },
      merge(homonyme) {
          // especially for "uid" attr, but also "mifare", "barcode"
          Helpers.eachObject(homonyme, (attr, val) => {
            if (attr === "score") return;
            if (val && !this.v[attr]) { console.log("adding " + attr + " = " + val); this.v[attr] = val; }
          });
      },
      reject() {
        Ws.remove(this.id).then(this.nextStep);
      }
    },
};

