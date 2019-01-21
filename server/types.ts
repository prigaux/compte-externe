import * as express from 'express';
import * as mongodb from 'mongodb';
import * as conf from './conf';

declare global {
    
interface CurrentUser {
  id: string;
  mail: string;
}
type req = express.Request;
type res = express.Response;

type Mails = string[]

type id = string
type v = typeof conf.ldap.people.types & { noInteraction?: boolean, various?: any }
type response = { [index: string]: any };
type sv = {
  _id?: mongodb.ObjectID;
  modifyTimestamp?: Date;

  id?: id,
  step: string,
  v: v,
  v_ldap?: v,
  lock?: boolean,
}
type sva = sv & { attrs: StepAttrsOption };

type r = response & { success: boolean, step?: string, labels?: StepLabels, nextBrowserStep: string }
type vr = {v: v; response?: response }
type svr = sv & { response?: response }
type svra = sva & { response?: response }
type simpleAction = (req: any, sv: {v: v}) => Promise<vr>
type action = (req: any, sv: sva) => Promise<vr>
type acl_search = {    
    v_to_users(v: v, attr: string): Promise<string[]>
    user_to_subv(user: v): Promise<Partial<v>[]>
}

type profileValues = StepAttrOptionChoices & { fv: () => Partial<v> }

interface StepAttrOptionChoices {
  key: string;
  name?: string;
  sub?: StepAttrsOption;
}
interface StepAttrItemsOption {
  uiHidden?: boolean;
  uiType?: 'radio'|'select'|'checkbox'|'email'|'text'|'url' | 'phone'|'mobilePhone'|'frenchPostalCode'|'date'|'dateThreeInputs'|'postalAddress'|'photo' | 'etablissement'|'structure'|'password'|'siret' | 'array';

  pattern?: string;
  min?: number;
  minYear?: number;
  max?: number;
  maxYear?: number;
}
type StepAttrOption = StepAttrItemsOption & {
  readOnly?: boolean;
  hidden?: boolean;
  toUserOnly?: boolean; // implies hidden
  format?: 'date' | 'data-url';
  
  default?: string;

  optional?: boolean;
  choices?: StepAttrOptionChoices[];
  items?: StepAttrItemsOption,
  title?: string;
  description?: string;
  labels?: { advice?: string; tooltip?: string; }
}
type StepAttrsOption = Dictionary<StepAttrOption>;

interface StepLabels {
    title_in_list?: string; // an empty description means "hide this step in ModerateList"
    title?: string;
    description?: string;
    okButton?: string;
    cancelButton?: string;

    added?: string;
    accepted?: string;
}

interface StepNotify {
  added?: string;
  rejected?: string;
  accepted?: string;    
}
type step = {
  labels: StepLabels;
  acls?: acl_search[];

  initialStep?: boolean;

  attrs_pre?: Dictionary<{}>; // passed to /api/comptes/xxx as query arguments
  allow_many?: boolean; 
  
  attrs: StepAttrsOption | ((v) => StepAttrsOption);
  next?: string | ((v) => string);
  nextBrowserStep?: string;
  notify?: StepNotify;
  action_pre?: action;
  action_post?: action;
}
type steps = Dictionary<step>

type ldap_RawValue = string | string[]

type ldap_conversion = {
    fromLdap?(s: string): any;
    fromLdapMulti?(l: string[]): any;
    fromLdapB?(s: Buffer): any;
    fromLdapMultiB?(l: Buffer[]): any;
    toLdap(v: any): ldap_RawValue;
    toLdapJson?(v: any): ldap_RawValue;
    applyAttrsRemapAndType?: true, 
}

}
