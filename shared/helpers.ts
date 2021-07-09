// useful for "object literals" when you do not want to create a variable:
// - it is more strict than typescript type assertion ( https://basarat.gitbook.io/typescript/type-system/type-assertion#assertion-considered-harmful )
// - error messages are simpler
export const is = <T>(v: T) => v

export const addDays = (date : Date, days : number) => {
    let r = new Date(date);
    r.setTime(r.getTime() + days * 60 * 60 * 24 * 1000);
    return r;
}

export const addYears = (date : Date, years : number) => {
    let r = new Date(date);
    r.setFullYear(r.getFullYear() + years)
    return r;
}

export const nextDate = (pattern : string, date: Date) => {
    let s = pattern.replace(/^XXXX-/, "" + date.getFullYear() + "-");
    let r = new Date(s);
    if (r.getTime() < date.getTime()) r.setFullYear(r.getFullYear() + 1);
    return r;
}

export const setTimeoutPromise = (time: number) => (
    new Promise((resolve, _) => setTimeout(resolve, time))
);

export function padStart(value : any, length : number, char : string) : string {
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
    if (!date) return null;
    return format.split(/(yyyy|MM|dd|HH|mm|ss)/).map(function (item) {
        switch (item) {
            case 'yyyy': return date_.getFullYear();
            case 'MM': return padStart(date_.getMonth() + 1, 2, '0');
            case 'dd': return padStart(date_.getDate(), 2, '0');
            case 'HH': return padStart(date_.getHours(), 2, '0');
            case 'mm': return padStart(date_.getMinutes(), 2, '0');
            case 'ss': return padStart(date_.getSeconds(), 2, '0');
            default: return item;
        }
    }).join('');   
}

const frenchPhone_pattern = "^(\\+33|0)\\s*[1-9](\\s*[0-9]){8}$"

export const maybeFormatPhone = (resultFrenchPrefix: string) => (maybePhone : string) : string => {
    if (maybePhone.match(frenchPhone_pattern)) {
        return maybePhone.replace(/^(\+33|0)/, '').replace(/\s/g, '').replace(/(.)(..)(..)(..)(..)/, resultFrenchPrefix + "$1 $2 $3 $4 $5");
    }
    return maybePhone;
}

export const compute_absolute_date = (relativeDate: relativeDate, date: Date = new Date()) => {
    const [ , number_, what ] = relativeDate.match(/^(.*?)(D|EY|SY|Y)$/) || []
    const number = parseInt(number_)

    switch (what.toUpperCase()) {
        case "D":
            return addDays(date, number)
        //case "M":
        //    return addMonths(startdate, number)
        case "Y":
            return addYears(date, number)
        case "SY":
            return nextDate("XXXX-01-01", addYears(date, number - 1))
        case "EY":
            return nextDate("XXXX-12-31", addYears(date, number))
        default:
            throw "getExpiryDate: invalid code " + what
    }
}

export const to_absolute_date = (date: Date | relativeDate) => (
    date instanceof Date ? date : date && compute_absolute_date(date, new Date())
)
