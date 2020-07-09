declare namespace Express {
    export interface Request {
       user?: CurrentUser;
    }
 }

// added in helpers.ts
interface Promise<T> {
    tap<U>(onFulFill: (value: T) => Promise<U>): Promise<T>;
    tap<U>(onFulfill: (value: T) => U): Promise<T>;

    finally<U>(onFulfill: () => void): Promise<U>;
    _ensureTypeSafety: T;
}

declare module 'nodemailer-sendmail-transport' {  
  export = nodemailerSendmailTransport.sendmailTransport;

  module nodemailerSendmailTransport {
    function sendmailTransport(any): any;
  }
}

declare module 'ldapjs' {
    export interface SearchOptions {
      attributes?: string[];
      scope?: string;
      filter?: string;
      sizeLimit?: number;
    }
    export interface Client {
          on: any;
        bind: any; 
      search: any;
      destroy(): void;
    }
    
    export function createClient(options: any): Client
    export function createServer(): any
    export function parseFilter(string): any
    export function parseDN(string): any
    
    export class InvalidCredentialsError {}
    export class NoSuchObjectError { constructor(any) }
}

