'use strict';

angular.module('myApp')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/moderate', {
    templateUrl: 'templates/list.html',
    controller: 'ModerateListCtrl'
  });
}])

.controller('ModerateListCtrl', function(ws: WsService.T, $scope) {

    function listRec(params) {
        ws.listInScope($scope, params).then(function () {
            listRec({ poll: true });
        });
    }
    listRec({});
});
