/// <reference path='../typings/tsd.d.ts' />

declare type ldapEntry = any
declare type id = string
declare type v = any
declare type response = any
declare type sv = {
  id : id,
  step: string,
  v : v,
}

declare type svr = sv | { response : response }

declare type acl_search = (v, string) => Promise<ldapEntry[]>

declare interface step {
  acls: acl_search[]
}



declare module 'nodemailer-sendmail-transport' {  
  export = nodemailerSendmailTransport.sendmailTransport;

  module nodemailerSendmailTransport {
    function sendmailTransport(any) : any;
  }
}

declare module 'simple-get' {
    import { ClientRequest, IncomingMessage } from 'http'

    interface Options {
	headers? : {};
	timeout? : number;
    }

    export function post(opts : Options, callback: (err:any, result: IncomingMessage) => void): ClientRequest
}

declare module 'ldapjs' {
    export interface Client {
     	bind: any, 
      search: any
    }
    
    export function createClient(options : any): Client
    export function createServer(): any
    export function parseFilter(string): any
    
    export class InvalidCredentialsError {}
    export class NoSuchObjectError { constructor(any) }
}

declare module 'concat-stream' {
  import { Writable } from 'stream'

  function concatStream (cb: (data: any) => any): Writable
  function concatStream (opts: { encoding: string }, cb: (data: any) => any): Writable

  export = concatStream
}
