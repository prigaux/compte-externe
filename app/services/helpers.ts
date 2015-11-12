class HelpersService {
 constructor (private $sce: ng.ISCEService, private $http: ng.IHttpService, private $q: ng.IQService) {
 }

    static entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    escapeHtml(str) {
        return String(str).replace(/[&<>"'\/]/g, (s) =>
               HelpersService.entityMap[s]
        );
    }

    formatDifferences(val1, val2) {
        /* globals JsDiff */
        var diff = JsDiff.diffChars(val1, val2);
        var fragment1 = '';
        var fragment2 = '';
        for (var i = 0; i < diff.length; i++) {
            if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
                var swap = diff[i];
                diff[i] = diff[i + 1];
                diff[i + 1] = swap;
            }

            var txt = this.escapeHtml(diff[i].value);
            if (diff[i].removed) {
                fragment1 += '<ins>' + txt + '</ins>';
            } else if (diff[i].added) {
                fragment2 += '<ins>' + txt + '</ins>';
            } else {
                fragment1 += txt;
                fragment2 += txt;
            }
        }
        return [fragment1, fragment2].map(this.$sce.trustAsHtml);
    }

    frenchPostalCodeToTowns(postalCode: string, token: string = ''): ng.IPromise<string[]> {
        var url = '//search-towns-as.univ-paris1.fr/';
        var params = { postalcode: postalCode, country: 'FR', token: token };
        return this.$http.get(url, { params: params }).then((r) => 
            r.data && r.data['towns']
        );
    }
}

angular.module('myApp').service("helpers", HelpersService);
