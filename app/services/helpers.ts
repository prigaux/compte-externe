namespace Helpers {
 export function create($sce: ng.ISCEService, $http: ng.IHttpService, $injector) {

    const entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    function escapeHtml(str) {
        return String(str).replace(/[&<>"'\/]/g, (s) =>
               entityMap[s]
        );
    }

    function formatDifferences(val1, val2) {
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

            var txt = escapeHtml(diff[i].value);
            if (diff[i].removed) {
                fragment1 += '<ins>' + txt + '</ins>';
            } else if (diff[i].added) {
                fragment2 += '<ins>' + txt + '</ins>';
            } else {
                fragment1 += txt;
                fragment2 += txt;
            }
        }
        return [fragment1, fragment2].map($sce.trustAsHtml);
    }

    function frenchPostalCodeToTowns(postalcode: string, token: string = ''): ng.IPromise<string[]> {
        var url = '//search-towns-as.univ-paris1.fr/';
        var params = { postalcode, token, country: 'FR' };
        return $http.get(url, { params }).then((r) => 
            r.data && r.data['towns']
        );
    }
    function inject<T>(f: (...any) => T): T {
       return $injector.invoke(f);
     }

    return { formatDifferences, frenchPostalCodeToTowns, inject };
  }
  let o = Ts.getReturnType(create);
  export type T = typeof o;
}

angular.module('myApp').service("helpers", Helpers.create);
