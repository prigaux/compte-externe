import * as _ from 'lodash';
import shared_conf from '../conf';

const remove_accents = _.deburr;

const remove_special_chars = (s: string) => (
    s.replace(/[',.-]/g, '')
)

const compute_allowed = (allowed_elts: string[]): Dictionary<number> => {
    let allowed: Dictionary<number> = {};
    let prev;
    for (const s of allowed_elts) {
        for (const word of s.split(' ')) {
            allowed[word] = 1;
            if (prev) allowed[prev + word] = 2; // to match "landier-edmond" with sn:edmond up1BirthName:landier
            prev = word;
        }
    }
    return allowed
}

const get_and_remove = <T>(o: Dictionary<T>, key: string): T => {
    const val = o[key];
    delete o[key];
    return val;
}

const remove_allowed_words = (words: string[], allowed: Dictionary<number>, prev_allowed: Dictionary<number>, must_remove: boolean) => {
    const minRemaining = prev_allowed ? 0 : 1;
    let removed = false;
    //console.log(removed, minRemaining, words, allowed);
    while (words.length > minRemaining) {
        if (words.length > 1 + minRemaining && get_and_remove(allowed, words[0] + words[1])) { // to match "ben adam" with givenName:ben-adam or benadam
            words.shift();
            words.shift();
        } else if (get_and_remove(allowed, words[0])) {
            words.shift();
        } else {
            break;
        }
        removed = true;
    }
    //console.log(removed, minRemaining, words);
    if (!removed && must_remove || !minRemaining && words.length) {
        if (!removed && prev_allowed && prev_allowed[words[0]]) {
            return "Le nom annuaire doit comprendre de(s) prénom(s) suivi de(s) nom(s)";
        }
        const allowed_ = Object.keys(_.pickBy({ ...(!removed && prev_allowed), ...allowed }, v => v !== 2))
        return `« ${words[0]} » n'est pas autorisé. ${allowed_.length > 1 ? 'Autorisés' : 'Autorisé'} : ${allowed_.join(', ')}`;
    } else {
        return undefined;
    }
}

const _merge_at = (v: {}, attrs: string[]): string[] => _.compact(_.merge(_.at(v, attrs)))


export default (displayName: string, v_orig: {}) => {
    const prepare_for_compare = (val: string) => remove_special_chars(remove_accents(val)).toLowerCase()    

    const sns = _merge_at(v_orig, shared_conf.sns)
    const givenNames = _merge_at(v_orig, shared_conf.givenNames)

    let toCheck = prepare_for_compare(displayName).split(' ');
    let allowed_sns = compute_allowed(sns.map(prepare_for_compare));
    let allowed_givenNames = compute_allowed(givenNames.map(prepare_for_compare));

    const allow_no_givenName = _.isEmpty(givenNames) || givenNames[0] === '.' // "." is sometimes used to mean "unknown" (GLPI UP1#113794)

    const err = toCheck.length <= 1 && !allow_no_givenName && "Le nom annuaire doit comprendre le prénom et le nom" ||
        remove_allowed_words(toCheck, allowed_givenNames, undefined, !allow_no_givenName) ||
        remove_allowed_words(toCheck, allowed_sns, allowed_givenNames, true);
    return err;
}
