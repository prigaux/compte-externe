import profiles from './steps/conf_profiles';
import { filters } from './ldap';

// exemples :
// - profilename : {COMPTEX}learner.DS32:cdeed-2017-S02
// - grouper : students:learner:DS32:cdeed-2017-S02
// - moodle : groups-students.learner.DS32.cdeed-2017-S02

const cron = "0 30 * * * ?";

export default (_req: req, res: res) => {
    res.write(`
grouperSession = GrouperSession.startRootSession();
getGroup(fullname) { return GroupFinder.findByName(grouperSession, fullname, false); }
`);

    for (const p of profiles) {
        let [parentStem, id] = p.const.split(':');
        parentStem = parentStem.replace(/^\{COMPTEX\}/, 'students:').replace('.', ':');
        const filter = filters.eq("eduPersonEntitlement", p.fv().eduPersonEntitlement);
        res.write(`
attrs = new Hashtable();
attrs{"parentStem"} = "${parentStem}";
attrs{"id"} = "${id}";
attrs{"name"} = "${p.title}";
attrs{"filter"} = "${filter}"

group = getGroup(attrs{"parentStem"} + ":" + attrs{"id"});
if (group == null) group = addGroup(attrs{"parentStem"}, attrs{"id"}, attrs{"name"});
group.setDescription(attrs{"name"});
group.store();
attributeAssign = group.getAttributeDelegate().assignAttribute(LoaderLdapUtils.grouperLoaderLdapAttributeDefName()).getAttributeAssign();
a = attributeAssign.getAttributeValueDelegate();
a.assignValue(LoaderLdapUtils.grouperLoaderLdapTypeName(), "LDAP_SIMPLE");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapServerIdName(), "personLdap");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapSourceIdName(), "ldap");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapSubjectAttributeName(), "eduPersonPrincipalName");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapSubjectIdTypeName(), "subjectId");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapQuartzCronName(), "${cron}");
a.assignValue(LoaderLdapUtils.grouperLoaderLdapFilterName(), attrs{"filter"});
a.assignValue(LoaderLdapUtils.grouperLoaderLdapSearchDnName(), "ou=people");
loaderRunOneJob(group);
`);
    }
    res.end();
};