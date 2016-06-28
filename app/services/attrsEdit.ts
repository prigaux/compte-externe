namespace AttrsEditController {
  export type params = {
    id: string;
    expectedStep?: string;
    nextStep: (resp: {}) => void;
  }

  export const create = (helpers: Helpers.T, ws: WsService.T, conf) => ($scope: angular.IRootScopeService, params: params) => {
    const accentsRange = '\u00C0-\u00FC';
    const month2maxDay = [undefined,
        31, 29, 31, 30, 31, 30,
        31, // july
        31, 30, 31, 30, 31];

    let o = Ts.assign($scope, {
      label: conf.attr_labels,
      attr_formatting: conf.attr_formatting,
      allowedCharsInNames: "[A-Za-z" + accentsRange + "'. -]",
      passwordPattern: /(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z]).{8,}/,
      maxDay: 31,
      maxYear: new Date().getUTCFullYear(),
      v: <V> undefined,
      errorMessages: {},
      webcamLiveCtrl: { width: 240, height: 300 },
      structures_search: ws.structures_search,
      frenchPostalCodeToTowns: helpers.frenchPostalCodeToTowns,
    });

    o.$watch(Ts.try_(() => o.v.birthDay.month), (month) => {
        o.maxDay = month2maxDay[month] || 31;
    });

    //o.$watch(helpers.try_(() => helpers.cast(o.v.homePostalAddress, HomePostalAddressPrecise).postalCode), (postalCode) => {
    o.$watch('v.homePostalAddress.postalCode', (postalCode: string) => {
            if (!postalCode) return;
            var address = Ts.cast(o.v && o.v.homePostalAddress, HomePostalAddressPrecise);
            if (address) {
                helpers.frenchPostalCodeToTowns(postalCode).then((towns) => {
                    if (towns && towns.length === 1) {
                        address.town = towns[0];
                    }
                });
            }
    });

    ws.getInScope(o, params.id, params.expectedStep);

    function submit() {
        //if (!o.myForm.$valid) return;
        ws.set(params.id, o.v).then(params.nextStep);
    }
    function reject() {
        ws.remove(params.id).then(params.nextStep);
    }
    
    return Ts.assign(o, { submit, reject });
  };
}
