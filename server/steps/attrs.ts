import { mapAttrs } from "../step_attrs_option";
import * as utils from '../utils'
import shared_conf from '../../shared/conf';

export const forceAttrs = (attrs: StepAttrsOption, optsToForce: StepAttrOption) => (
    mapAttrs(attrs, (opts) => ({ ...opts, ...optsToForce }))
)

// @ts-expect-error
export const merge_mpp : <T extends Mpp<StepAttrOption>>(mpp: Mpp<StepAttrOption>, choice: T) => T = utils.deep_extend_concat


export const attrsHelpingDiagnoseHomonymes = (
    { 
        global_main_profile: { 
            toUser(_: any, v: v) {
                return v.uid && { description: ` est ${shared_conf.affiliation_labels[v.global_eduPersonPrimaryAffiliation] || 'un ancien compte sans affiliation'}` }
            },
            toUserOnly: true, 
            uiHidden: true,
        },
    }
);

