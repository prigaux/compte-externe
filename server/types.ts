import conf = require('./conf');

declare global {
    
interface CurrentUser {
  id: string;
  mail: string;
}
type Mails = string[]

type id = string
type v = typeof conf.types & { autoCreate: boolean }
type response = any
type sv = {
  id?: id,
  step: string,
  v: v,
  moderators?: Mails,
  attrs?: StepAttrsOption,
}

type vr = {v: v; response?: response }
type svr = sv & { response?: response }
type simpleAction = (req: any, sv: {v: v}) => Promise<vr>
type action = (req: any, sv: sv) => Promise<vr>
type acl_search = (v, string) => Promise<string[]>

interface StepAttrOption {
  readonly?: boolean;
  hidden?: boolean;
  max?: number;
}
type StepAttrsOption = Dictionary<StepAttrOption>;

interface StepNotify {
  added?: string;
  rejected?: string;
  accepted?: string;    
}
type step = {
  acls?: acl_search[];
  attrs: StepAttrsOption;
  next?: string;
  notify?: StepNotify;
  action_pre?: action;
  action_post?: action;
}
type steps = Dictionary<step>

type ldap_RawValue = string | string[]

type ldap_conversion = {
    fromLdap?(s: string): any;
    fromLdapMulti?(l: string[]): any;
    toLdap(any): ldap_RawValue;
}

}
