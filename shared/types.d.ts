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

    uiOptions?: { rows?: number; autocomplete?: boolean, title_rowspan?: boolean };

    uiHidden?: boolean;

    uiType?: uiTypes;

    pattern?: string;
    min?: number;
    minYear?: number;
    max?: number;
    maxYear?: number;
}
    
type MinimalStepAttrOption = StepAttrItemsOption & {
    title?: string;
    description?: string;  
    labels?: { advice?: string; warning?: string; tooltip?: string; }

    format?: 'date' | 'data-url' | 'phone';
    default?: string;

    allowedChars?: string;
}

type MoreStepAttrOption = MinimalStepAttrOption & {
    normalize?: (s: string) => string;
    formatting?: (val) => string;
    formatting_html?: (val) => string;
    onChange?: (v: {}, _: string, val) => void;
    validator?: (val, v_orig: {}) => string;

    items?: MoreStepAttrOption,

    minDate?: Date;
    maxDate?: Date;
}

type MoreStepAttrsOption = Dictionary<MoreStepAttrOption>;
