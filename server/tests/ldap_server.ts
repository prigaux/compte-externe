'use strict';

module.exports = params => {
const ldap = require('ldapjs');
const host = 'localhost';
const db = params.DNs;

const server = ldap.createServer();

function authorize(req, res, next) {
  if (req.dn.toString() !== params.dn || req.credentials !== params.password) {
      //console.log(req.dn.toString(), '!==', params.dn, '||', req.credentials, '!==', params.password);
      return next(new ldap.InvalidCredentialsError());
  }

  return next();
}

function search(dn, filter, scope) {
    let dns;
    if (scope === 'base') {
	dns = [dn.toString()];
    } else {
	dns = Object.keys(db).filter(k => (
	    dn.equals(k) || dn.parentOf(k)
	));
    }
    // force case insensitive on all attrs
    // (workaround bug "Filters match on attribute values only case-sensitively #156")
    filter = ldap.parseFilter(filter.toString().toLowerCase());
    return dns.filter(dn => (
	filter.matches(db[dn])
    ));
}

server.search(params.base, (req, res, next) => {
  let dn = req.dn.toString();
  //console.log("ldap server.search", req.dn, req.filter);
  if (db[dn]) {
      let dns = search(req.dn, req.filter, req.scope);
      dns.forEach(dn => {
	  res.send({ dn: dn, attributes: db[dn] });
      });
      res.end();
      return next();
  } else {
      console.log("ldap_server.search: unknown dn", dn);
      console.log(db);
      return next(new ldap.NoSuchObjectError(dn));
  }
});

server.bind(params.base, authorize);

return new Promise((resolve, reject) => {    
    server.on('error', err => {
	reject(err);
    });	
    server.listen(params.port || 0, host, () => {
	//console.log('LDAP server up at: %s', server.url);
	resolve(server);
    });
});

};
