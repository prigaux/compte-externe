import * as express from 'express';
import * as mongodb from 'mongodb';
import * as conf from './conf';

declare global {
    
interface CurrentUser {
  id: string;
  mail: string;
}
type req = express.Request;

type Mails = string[]

type id = string
type v = typeof conf.ldap.people.types & { noInteraction?: boolean }
type response = { [index: string]: any };
type sv = {
  _id?: mongodb.ObjectID;
  modifyTimestamp?: Date;

  id?: id,
  step: string,
  v: v,
  moderators?: Mails,
  attrs?: StepAttrsOption,
}

type r = response & { success: boolean, step?: string, labels?: StepLabels }
type vr = {v: v; response?: response }
type svr = sv & { response?: response }
type simpleAction = (req: any, sv: {v: v}) => Promise<vr>
type action = (req: any, sv: sv) => Promise<vr>
type acl_search = (v, string) => Promise<string[]>

interface StepAttrOptionChoices {
  key: string;
  name?: string;
}
interface StepAttrOption {
  readonly?: boolean;
  hidden?: boolean;
  toUserOnly?: boolean; // implies hidden

  optional?: boolean;
  pattern?: string;
  max?: number;
  choices?: StepAttrOptionChoices[];
}
type StepAttrsOption = Dictionary<StepAttrOption>;

interface StepLabels {
    title?: string;
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
  
  attrs: StepAttrsOption;
  next?: string | ((v) => string);
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
}

}
