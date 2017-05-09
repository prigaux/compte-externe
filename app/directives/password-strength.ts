'use strict';

(function () {
                                                
var colors = [ "red", "#ffd801", "orange", "#3bce08", "#3bce08" ];
var msgs = [ "Très faible", "Faible", "Moyen", "Fort", "Très fort" ];


function toCategories(passwd) {
    return passwd
        .replace(/[a-z]/g, 'a')
        .replace(/[A-Z]/g, 'A')
        .replace(/[0-9]/g, '0')
        .replace(/[!,@#$%^&*?_~]/g, '!');
}

var rules = [
    { points: 1, regexp: /a/, desc: "at least one lower case char" },
    { points: 5, regexp: /A/, desc: "at least one upper case char" },
    { points: 5, regexp: /0/, desc: "at least one number" },
    { points: 5, regexp: /0.*0.*0/, desc: "at least three numbers" },
    { points: 5, regexp: /!/, desc: "at least one special char" },
    { points: 5, regexp: /!.*!/, desc: "at least two special chars" },
    { points: 2, regexp: /a.*A|A.*a/, desc: "upper and lower letters" },
    { points: 2, regexp: /[aA].*0|0.*[aA]/, desc: "letters and numbers" },
    { points: 2, regexp: /[aA0].*!|!.*[aA0]/, desc: "letters, numbers and special chars" },
];

function strengthlevel(score) {
    return score < 12 ? 0 :
        score < 20 ? 1 :
        score < 27 ? 2 :
        score < 45 ? 3 : 4;
}
                
function computeScore(passwd) {
    var score = 0;
    var logs = [];

    var lengthScore =
        passwd.length < 5 ? 3 :
        passwd.length < 8 ? 6 :
        passwd.length < 16 ? 12 : 18;
    score += lengthScore;
    logs.push(lengthScore + " points for password length " + passwd.length);

    var simplified = toCategories(passwd);

    rules.forEach(function (rule) {
        if (simplified.match(rule.regexp)) {
            score += rule.points;
            logs.push(rule.points + " points for " + rule.desc);
        }
    });

    logs.push("total for " + passwd + ": " + score + " points");

    //console.log(logs.join("\n"));
    
    return score;
}

Vue.directive("passwordStrength", function() {
    return {
        restrict: 'A',
        scope: { passwd: '=passwordStrength' },
        controller($scope) {
            $scope.$watch('passwd', function (passwd) {
                var score = computeScore(passwd || '');
                var level = strengthlevel(score);
                $scope.width = (score * 5) + "px";
                $scope.color = colors[level];
                $scope.msg = msgs[level];
            });
        },
        template: '<span :style="{color: color}">{{msg}}</span>' +
            '<div style="font-size: 1px; height: 3px; border: 1px solid white" :style="{width: width, background: color}"></div>',

    };
});

}());
