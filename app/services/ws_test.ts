'use strict';

describe('service ws', function() {

    beforeEach(angular.mock.module('myApp'));

    it('should exists', inject(function(ws) {
      expect(ws).toBeDefined();
    }));

    describe('homePostalAddress', function(){
	
	it('should encode/decode homePostalAddress', inject(function(ws, $sce) {
	    function check(in_, out) {
		var r = ws.fromWs({ homePostalAddress: in_ });
		expect(r.homePostalAddress).toEqual(out);
		expect(ws.toWs(r).homePostalAddress).toEqual(in_);
	    }
	    check("44 rue balard$75015 PARIS$FRANCE",
		  { postalCode: '75015', town: 'PARIS', country: 'FRANCE', line1: '44 rue balard', line2: '' });
	    check("APPT 11 BAT B$12, Rue DE LA ROQUETTE$75011 PARIS$FRANCE",
		  { postalCode: '75011', town: 'PARIS', country: 'FRANCE', line1: 'APPT 11 BAT B', line2: '12, Rue DE LA ROQUETTE' });
	    check("6 bis rue DES BOURGUIGNONS$HAMEAU DE BEZANLEU$77710 TREUZY LEVELAY$FRANCE",
		  { postalCode: '77710', town: 'TREUZY LEVELAY', country: 'FRANCE', line1: '6 bis rue DES BOURGUIGNONS', line2: 'HAMEAU DE BEZANLEU' });	    
	}));
	
    });
});
