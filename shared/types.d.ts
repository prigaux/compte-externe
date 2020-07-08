interface Dictionary<T> {
    [index: string]: T;
}

type uiTypes =
    'radio'|'select'|'checkbox'|'email'|'password'|'text'|'url' |
    'textarea'|'phone'|'mobilePhone'|'frenchPostalCode'|'date' |
    'dateThreeInputs'|'postalAddress'|'cameraSnapshot'|'photoUpload' |
    'autocomplete'|'newPassword'|'siret' | 'array' | 'homonym' |
    'tab';

interface StepAttrItemsOption {
    uiPlaceholder?: string;

    uiOptions?: { 
        rows?: number;
        autocomplete?: boolean
        title_rowspan?: boolean
        title_hidden?: boolean
        allowOnelineForm?: boolean
    };

    uiHidden?: boolean;

    uiType?: uiTypes;

    pattern?: string;
    min?: number;
    minYear?: number;
    max?: number;
    maxYear?: number;

    // for images
    width?: number
    ratio?: number
    photo_quality?: number // 1 is best quality
}
    
type MinimalStepAttrOption = StepAttrItemsOption & {
    title?: string;
    description?: string;  
    labels?: { 
        advice?: string; // displayed for non valid values
        tooltip?: string;
        warning?: string; // similar to tooltip, but with a "warning" sign
    }
    items?: MinimalStepAttrOption,

    format?: 'date' | 'image/jpeg' | 'phone';
    default?: string;

    allowedChars?: string;
    allowUnchangedValue?: boolean // if the user changes the value, the value must pass checks. If kept unchanged, it bypasses checks!
}

type SharedStepAttrOption = MinimalStepAttrOption & {
    normalize?: (s: string) => string;
    formatting?: (val) => string;
    formatting_html?: (val) => string;
    onChange?: (v: {}, _: string, val) => void;
    validator?: (val, v_orig: {}) => string;

    minDate?: Date;
    maxDate?: Date;
}

type SharedStepAttrsOption = Dictionary<SharedStepAttrOption>;

interface MergePatchOptions {
    newRootProperties?: 'ignore' | { ignore: string[] } // all | a list of attribute names
}

type StepAttrOptionChoicesT<T> = {
  const: string;
  title?: string;
} & MppT<T>

type MppT<T> = {
  merge_patch_parent_properties?: Dictionary<T>;
  merge_patch_options?: MergePatchOptions, // if given, "merge_patch_parent_properties" is only used on client-side
}

interface CommonStepAttrOptionT<T> extends MinimalStepAttrOption {
  readOnly?: boolean;
  
  // constraints below are checked when sent by the user. Values from action_pre/action_post are not verified!
  optional?: boolean;
  properties?: Dictionary<T>;
  oneOf?: StepAttrOptionChoicesT<T>[];
  if?: { optional: false };
  then?: MppT<T>;
}

// create the recursive type
type StepAttrOptionM<More> = CommonStepAttrOptionT<StepAttrOptionM<More>> & More

type StepAttrsOptionM<More> = Dictionary<StepAttrOptionM<More>>;

interface ClientSideOnlyStepAttrOption {
    oneOf_async?: string;
}

type CommonV = Dictionary<string|string[]>
