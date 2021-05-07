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
    function sendmailTransport(options: Dictionary<any>): any;
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
    export function parseFilter(filter: string): any
    export function parseDN(dn: string): any
    
    export class InvalidCredentialsError {}
    export class NoSuchObjectError { constructor(dn: string) }
}

declare module 'ldapjs-promise-disconnectwhenidle' {
    import * as ldapjs from 'ldapjs'
    function init(conf: { uri: string[]; dn?: string; password?: string; disconnectWhenIdle_duration?: number; verbose?: boolean }): void
    function destroy(): void
    function force_new_clientP(): Promise<unknown>
    interface SearchEntryObjectRaw {
        raw: { dn: string; controls: any[] } & Dictionary<Buffer | Buffer[]>
    }
    function searchRaw(base: string, filter: string, attributes: string[], options: ldapjs.SearchOptions): Promise<SearchEntryObjectRaw[]>
}

declare module 'connect-cas' {
    import { RequestHandler } from 'express'

    export function configure(opts: {}): {}
    export function serviceValidate(overrides?: {}): RequestHandler
    export function authenticate(): RequestHandler
    export function proxyTicket(options?: {}): RequestHandler
}

declare module 'simple-get' {
    import { IncomingMessage } from 'http'
    function simpleGet(options: Dictionary<any>, cb: (err: string, res: IncomingMessage) => void): void
    export = simpleGet
}

