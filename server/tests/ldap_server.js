'use strict';

module.exports = function (params) {
var ldap = require('ldapjs');
var host = 'localhost';
var db = params.DNs;

var server = ldap.createServer();

function authorize(req, res, next) {
  if (req.dn.toString() !== params.dn || req.credentials !== params.password) {
      //console.log(req.dn.toString(), '!==', params.dn, '||', req.credentials, '!==', params.password);
      return next(new ldap.InvalidCredentialsError());
  }

  return next();
}

function search(dn, filter, scope) {
    var dns;
    if (scope === 'base') {
	dns = [dn.toString()];
    } else {
	dns = Object.keys(db).filter(function(k) {
	    return dn.equals(k) || dn.parentOf(k);
	});
    }
    // force case insensitive on all attrs
    // (workaround bug "Filters match on attribute values only case-sensitively #156")
    filter = ldap.parseFilter(filter.toString().toLowerCase());
    return dns.filter(function (dn) {
	return filter.matches(db[dn]);
    });
}

server.search(params.base, function(req, res, next) {
  var dn = req.dn.toString();
  //console.log("ldap server.search", req.dn, req.filter);
  if (db[dn]) {
      var dns = search(req.dn, req.filter, req.scope);
      dns.forEach(function (dn) {
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

return new Promise(function (resolve, reject) {    
    server.on('error', function (err) {
	reject(err);
    });	
    server.listen(params.port || 0, host, function () {
	//console.log('LDAP server up at: %s', server.url);
	resolve(server);
    });
});

};
