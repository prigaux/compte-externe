const Create : vuejs.ComponentOption = {
  templateUrl: 'templates/create.html',
  props: ['kind'],
  data() {
      return { 
        homonymes: undefined,
      };
  },

  mounted() {
    if (this.kind === 'cas') {
      Ws.set('new/cas', <V> {}).then(() => router.replace('/auto-created'));
      return;
    }
  },

  computed: {
    id() { return 'new/' + this.kind; },
    expectedStep() { return this.kind },
  },

  mixins: [AttrsForm_mixin],  

  methods: {
      nextStep(resp) {
          console.log("nextStep");
        if (resp.step === 'validate_email') {
            router.push('/awaiting-email-validation');
        } else if (resp.login && !resp.step) {
            router.push('/created/' + resp.login);
        } else if (resp.login) {
            router.push('/awaiting-moderation/' + resp.login);
        } else {
            // TODO need to pass by SP shib
            //$location.path('/location');
            router.push('/');
        }
    }
  },
};
