namespace Ts {

  export function getReturnType<T>(o: (...args) => T): T { return null; };

  // similar to ES6 Object.assign
  export function assign<T1, T2>(o1: T1, o2: T2): T1 & T2 {
     let r = o1;
     angular.forEach(o2, (v, k) => r[k] = v);
     return <T1 & T2> r;
  }

  // runtime cast
  export function cast<T>(o, c: { new(...any): T }): T {
    return o instanceof c && o;
  }
  export const try_ = <T>(f: () => T) => () => {
    try {
      return f();
    } catch (exception) {
      return undefined;
    }
  };
  
}
