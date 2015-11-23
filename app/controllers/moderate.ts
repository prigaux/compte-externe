'use strict';

function ModerateCtrl($location: ng.ILocationService, $scope: angular.IRootScopeService, ws: WsService.T, helpers: Helpers.T, $routeParams) {
    const id = $routeParams.id;

    let o = Ts.assign(helpers.inject(AttrsEditController.create)($scope, { 
      id, 
      nextStep,
    }), {
      homonymes: [],
    });

    function nextStep (resp) {
        if (resp.login && !resp.step) {
            // user created
            if (o.v.supannAliasLogin &&
                o.v.supannAliasLogin !== resp.login) {
                alert("L'utilisateur a été créé, mais avec l'identifiant « " + resp.login + "». Il faut prévenir l'utilisateur");
            }
        }
        $location.path('/moderate');
    }

    function computeComparisons(homonyme) {             
        var r = [];
        angular.forEach(o.v, function (val, attr) {
            var val1 = "" + val;
            var val2 = "" + homonyme[attr];
            if (val1 !== val2) {
                r.push({ attr, cmp: helpers.formatDifferences(val1, val2) });
            }
        });
        homonyme.comparisons = r;
    }

    o.$watchGroup(['v', 'homonymes'], function (l) {
        if (l[0] && l[1]) {
            o.homonymes.forEach(computeComparisons);
        }
    });

    ws.homonymes(id).then(function (l) {
        o.homonymes = l;
    });

    return o;
}

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/moderate/:id', {
    templateUrl: 'templates/moderate.html',
    controller: 'ModerateCtrl'
  });
}])

.controller('ModerateCtrl', ModerateCtrl);
