import * as express from 'express';
import * as mongodb from 'mongodb';
import * as conf from './conf';

declare global {
    
interface CurrentUser {
  id: string;
}
type req = express.Request;
type res = express.Response;

type Mails = string[]

type id = string
type v = typeof conf.ldap.people.types & { noInteraction?: boolean, profilename_to_modify?: string, various?: any }
type response = { [index: string]: any };
type sv = {
  _id?: mongodb.ObjectID;
  modifyTimestamp?: Date;

  id?: id,
  step: string,
  v: v,
  v_ldap?: v,
  vs?: v[],
  lock?: boolean,
}
type sva = sv & { attrs: StepAttrsOption };

type r = response & { success: boolean, step?: string, labels?: StepLabels, nextBrowserStep: string }
type vr = {v: v; vs?: v[]; response?: response }
type svr = sv & { response?: response }
type svra = sva & { response?: response }
type simpleAction = (req: req, sv: {v: v}) => Promise<vr>
type action = (req: any, sv: sva) => Promise<vr>
type acl_ldap_filter = string | boolean
type acl_mongo_filter = Dictionary<any> | boolean
type acl_search = {    
    v_to_ldap_filter(v: v): Promise<string>
    user_to_ldap_filter(user: CurrentUser): Promise<acl_ldap_filter>
    user_to_mongo_filter(user: CurrentUser): Promise<acl_mongo_filter>
}

type profileValuesT<T> = StepAttrOptionChoicesT<T> & { 
    fv: () => Partial<v>;
}

type Mpp<T> = MppT<T>

interface ServiceSideOnlyStepAttrOptions {
  hidden?: boolean;  

  toUserOnly?: boolean; // implies hidden
  toUser?: (val: string, v: v) => any;

  oneOf_async?: (token: string, sizeLimit: number) => Promise<StepAttrOptionChoices[]>; // if sizeLimit===1, it is used as an exact search
}
type StepAttrOptionT<MoreOptions> = StepAttrOptionM<ServiceSideOnlyStepAttrOptions & MoreOptions>;
type StepAttrsOptionT<M> = Dictionary<StepAttrOptionT<M>>;

interface StepAttrOption_no_extensions {}
type StepAttrOption = StepAttrOptionT<StepAttrOption_no_extensions>;
type StepAttrsOption = StepAttrsOptionT<StepAttrOption_no_extensions>;
type StepAttrOptionChoices = StepAttrOptionChoicesT<StepAttrOption>;
type profileValues = profileValuesT<StepAttrsOption>;

interface StepLabels {
    // vue templates
    title_in_list?: string; // an empty description means "hide this step in ModerateList"
    title?: string;
    description?: string;
    description_in_list?: string | ((req : req) => Promise<string>); // description displayed in list of steps (InitialStep / ModerateList)
    okButton?: string;
    cancelButton?: string;
    post_scriptum ?: string; // vue template displayed after the <form> (vars: v, v_pre)

    // vue templates: can use variable "resp" which is the response of "next" "action_pre" and/or "action_post"
    added?: string; // displayed reaching this step (through "next"). It will be prefered over "accepted" below.
    accepted?: string; // displayed when the "action_post" succeeded (but see "added" above if "next" step)
}

interface StepNotify {
  added?: string;
  rejected?: string;
  accepted?: string;    
}
type step = {
  labels: StepLabels;
  acls?: acl_search[];

  search_filter?: string;
  initialStep?: boolean;

  allow_many?: boolean; 
  if_no_modification?: 'disable-okButton',
  
  attrs: StepAttrsOption
  attrs_override?: ((req: req, sv: sv) => Promise<StepAttrsOption>);
  next?: string | ((v: v) => Promise<string>);
  nextBrowserStep?: string | ((v) => Promise<string>); // either /<step> or a full url
  notify?: StepNotify;
  action_pre?: action;
  action_post?: action;
}
type steps = Dictionary<step>

type ldap_RawValue = string | string[]
type ldap_modify = { action: 'add'|'delete', value: ldap_RawValue } | { action: 'ignore' }

type ldap_conversion = {
    fromLdap?(s: string): any;
    fromLdapMulti?(l: string[]): any;
    fromLdapB?(s: Buffer): any;
    fromLdapMultiB?(l: Buffer[]): any;
    toLdap(v: any): ldap_RawValue | ldap_modify;
    toLdapJson?(v: any): ldap_RawValue;
    toEsupActivBo?(v: any): ldap_RawValue;
    applyAttrsRemapAndType?: true, 
}

}
