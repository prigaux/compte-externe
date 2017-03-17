'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/validate/:id', {
    templateUrl: 'templates/validate.html',
    controller: 'ValidateCtrl'
  });
}])

.controller('ValidateCtrl', function($location: ng.ILocationService, $scope, $routeParams) {
    var url = '/api/comptes/' + $routeParams.id;

    function set(v) {
        axios.put(url, v).then(r => r.data).then(function (resp: any) {
            if (resp && resp.success) {
                $scope.finished = true;
            }
        }).catch(function (err) {
            alert(err);
        });
    }

    axios.get(url).then(r => r.data).then(function (sv: SVRaw) {
        if (sv.error) {
            alert(sv);
        } else {
            set(sv.v);
            
        }
    }).catch(function (err) {
        alert(err);
    });
});
