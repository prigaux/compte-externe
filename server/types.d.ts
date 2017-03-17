/// <reference path='../typings-server/tsd.d.ts' />

declare interface Dictionary<T> {
  [index: string]: T;
}

declare interface CurrentUser {
  id: string;
  mail: string;
}
declare type Mails = string[]

declare type id = string
declare type v = any
declare type response = any
declare type sv = {
  id?: id,
  step: string,
  v: v,
  moderators?: Mails,
  attrs?: StepAttrsOption,
}

declare type vr = {v: v; response?: response }
declare type svr = sv & { response?: response }
declare type simpleAction = (req: any, sv: {v: v}) => Promise<vr, any>
declare type action = (req: any, sv: sv) => Promise<vr, any>
declare type acl_search = (v, string) => Promise<string[], any>

declare interface StepAttrOption {
  readonly?: boolean;
  hidden?: boolean;
}
declare type StepAttrsOption = Dictionary<StepAttrOption>;

declare interface StepNotify {
  added?: string;
  rejected?: string;
  accepted?: string;    
}
declare type step = {
  acls?: acl_search[];
  attrs: StepAttrsOption;
  next?: string;
  notify?: StepNotify;
  action_pre?: action;
  action_post?: action;
}
declare type steps = Dictionary<step>


declare module 'nodemailer-sendmail-transport' {  
  export = nodemailerSendmailTransport.sendmailTransport;

  module nodemailerSendmailTransport {
    function sendmailTransport(any): any;
  }
}

declare module 'simple-get' {
    import { ClientRequest, IncomingMessage } from 'http';

    interface Options {
        headers? : {};
        timeout? : number;
    }

    export function post(opts: Options, callback: (err: any, result: IncomingMessage) => void): ClientRequest
}

declare module 'ldapjs' {
    export interface Options {
      attributes?: string[];
      scope?: string;
      filter?: string;
      sizeLimit?: number;
    }
    export interface Client {
        bind: any; 
      search: any;
    }
    
    export function createClient(options: any): Client
    export function createServer(): any
    export function parseFilter(string): any
    export function parseDN(string): any
    
    export class InvalidCredentialsError {}
    export class NoSuchObjectError { constructor(any) }
}

declare module 'concat-stream' {
  import { Writable } from 'stream';

  function concatStream (cb: (data: any) => any): Writable
  function concatStream (opts: { encoding: string }, cb: (data: any) => any): Writable

  export = concatStream
}
