import { mapAttrs } from "../step_attrs_option";

export const forceAttrs = (attrs: StepAttrsOption, optsToForce: StepAttrOption) => (
    mapAttrs(attrs, (opts) => ({ ...opts, ...optsToForce }))
)

