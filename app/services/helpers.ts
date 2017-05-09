namespace Helpers {

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

    export function formatDifferences(val1, val2) {
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
        return [fragment1, fragment2];
    }

    export function frenchPostalCodeToTowns(postalcode: string, token: string = ''): Promise<string[]> {
        var url = '//search-towns.univ-paris1.fr/';
        var params = { postalcode, token, country: 'FR' };
        return axios.get(url, { params }).then((r) => 
            r.data && r.data['towns']
        );
    }

    // runtime cast
    export function cast<T>(o, c: { new(...any): T }): T {
        return o instanceof c && o;
    }

    export function copy<T>(o : T) : T {
        return assign({}, o);
    }

    // similar to ES6 Object.assign
    export function assign<T1, T2>(o: T1, o2: T2): T1 & T2 {
        eachObject(o2, function (k, v) {
            o[k] = v;
        });
        return <T1 & T2> o;
    }

    export function simpleEach(a, fn) {
        var len = a.length;
        for(var i = 0; i < len; i++) {
            fn(a[i], i, a);
        }
    }

    export function eachObject<T>(o : T, fn : (string, any, T) => any) {
        for(var k in o) {
            if (o.hasOwnProperty(k))
                fn(k, o[k], o);
        }
    }

    export function createCookie(name : string, value : string, days : number) : void {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    export function getCookie(name : string) : string {
        var m = document.cookie.match(new RegExp(name + '=([^;]+)'));
        return m && m[1];
    }

    export function templateUrl(vmOpts : vuejs.ComponentOption) {
        return () =>
            axios.get(vmOpts['templateUrl']).then(resp => resp.data).then((template : string) => {
                vmOpts.template = template;
                return vmOpts;
            })
    }

    export function memoize(func, hasher) {
        var memo = {};
        return function() {
            var key = hasher.apply(this, arguments);
            return key in memo ? memo[key] : (memo[key] = func.apply(this, arguments));
        };
    }

    export function groupBy<T>(items : T[], getter : (T) => string) : Dictionary<T[]> {
        var result = {};
        items.forEach(function (elm) {
            var prop = getter(elm);    
            if (!result[prop]) result[prop] = [];
            result[prop].push(elm);
        });
        return result;
    }

    export function padStart(value, length : number, char : string) : string {
        value = value + '';
        var len = length - value.length;

        if (len <= 0) {
                return value;
        } else {
                return Array(len + 1).join(char) + value;
        }
    }

    export function formatDate(date : Date | string, format : string) : string {
        const date_ : Date = typeof date === "string" ? new Date(date) : date;
        return format.split(/(yyyy|MM|dd|HH|mm|ss)/).map(function (item) {
            switch (item) {
                case 'yyyy': return date_.getFullYear();
                case 'MM': return Helpers.padStart(date_.getMonth() + 1, 2, '0');
                case 'dd': return Helpers.padStart(date_.getDate(), 2, '0');
                case 'HH': return Helpers.padStart(date_.getHours(), 2, '0');
                case 'mm': return Helpers.padStart(date_.getMinutes(), 2, '0');
                case 'ss': return Helpers.padStart(date_.getSeconds(), 2, '0');
                default: return item;
            }
        }).join('');   
    }

    export function escapeRegexp(s : string) {
        return ('' + s).replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    }
}


