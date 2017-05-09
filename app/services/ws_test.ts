'use strict';

let raw = (o) => angular.extend({}, o);

describe('service ws', function() {

    beforeEach(angular.mock.module('myApp'));

    it('should exists', inject(function(ws) {
      expect(ws).toBeDefined();
    }));

    describe('homePostalAddress', function(){
        
        it('should encode/decode homePostalAddress', inject(function(ws: WsService.T, $sce) {
            function check(in_, out) {
                var r = ws.fromWs({ homePostalAddress: in_ });
                expect(raw(r.homePostalAddress)).toEqual(out);
                expect(ws.toWs(r).homePostalAddress).toEqual(in_);
            }
            check("44 rue balard\n75015 PARIS\nFRANCE",
                  { postalCode: '75015', town: 'PARIS', country: 'FRANCE', line1: '44 rue balard', line2: '' });
            check("APPT 11 BAT B\n12, Rue DE LA ROQUETTE\n75011 PARIS\nFRANCE",
                  { postalCode: '75011', town: 'PARIS', country: 'FRANCE', line1: 'APPT 11 BAT B', line2: '12, Rue DE LA ROQUETTE' });
            check("6 bis rue DES BOURGUIGNONS\nHAMEAU DE BEZANLEU\n77710 TREUZY LEVELAY\nFRANCE",
                  { postalCode: '77710', town: 'TREUZY LEVELAY', country: 'FRANCE', line1: '6 bis rue DES BOURGUIGNONS', line2: 'HAMEAU DE BEZANLEU' });            
        }));
        
    });
});
