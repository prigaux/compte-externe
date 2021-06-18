import { mapAttrs } from "../step_attrs_option";

export const forceAttrs = (attrs: StepAttrsOption, attrsToForce: Dictionary<any>) => (
    mapAttrs(attrs, (opts) => ({ ...opts, ...attrsToForce }))
)

