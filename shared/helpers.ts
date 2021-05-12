// useful for "object literals" when you do not want to create a variable:
// - it is more strict than typescript type assertion ( https://basarat.gitbook.io/typescript/type-system/type-assertion#assertion-considered-harmful )
// - error messages are simpler
export const is = <T>(v: T) => v

export const addDays = (date : Date, days : number) => {
    let r = new Date(date);
    r.setTime(r.getTime() + days * 60 * 60 * 24 * 1000);
    return r;
}

export const setTimeoutPromise = (time: number) => (
    new Promise((resolve, _) => setTimeout(resolve, time))
);
