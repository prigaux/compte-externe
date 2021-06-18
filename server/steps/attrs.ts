import { mapAttrs } from "../step_attrs_option";
import shared_conf from '../../shared/conf';

export const forceAttrs = (attrs: StepAttrsOption, optsToForce: StepAttrOption) => (
    mapAttrs(attrs, (opts) => ({ ...opts, ...optsToForce }))
)

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

