import * as Ws from '../services/ws';
import * as Helpers from './helpers';

let raw = (o) => Helpers.assign({}, o);

describe('service ws', function() {

    describe('homePostalAddress', function(){
        
        it('should encode/decode homePostalAddress', () => {
            function check(in_, out, in_out?) {
                var r = Ws.fromWs({ homePostalAddress: in_ });
                expect(raw(r.homePostalAddress)).toEqual(out);
                expect(Ws.toWs(r).homePostalAddress).toEqual(in_out || in_);
            }
            check("44 rue balard\n75015 PARIS\nFRANCE",
                  { postalCode: '75015', town: 'PARIS', country: 'FRANCE', lines: '44 rue balard', line2: '' });
            check("APPT 11 BAT B\n12, Rue DE LA ROQUETTE\n75011 PARIS\nFRANCE",
                  { postalCode: '75011', town: 'PARIS', country: 'FRANCE', lines: 'APPT 11 BAT B', line2: '12, Rue DE LA ROQUETTE' });
            check("6 bis rue DES BOURGUIGNONS\nHAMEAU DE BEZANLEU\n77710 TREUZY LEVELAY\nFrance",
                  { postalCode: '77710', town: 'TREUZY LEVELAY', country: 'FRANCE', lines: '6 bis rue DES BOURGUIGNONS', line2: 'HAMEAU DE BEZANLEU' }, 
                  "6 bis rue DES BOURGUIGNONS\nHAMEAU DE BEZANLEU\n77710 TREUZY LEVELAY\nFRANCE");
            check("7 Boulevard Jourdan\nCIUP\n403 Maison de l'Inde\n75014 PARIS 14EME\nFRANCE",
                  { lines: '7 Boulevard Jourdan', line2: "CIUP - 403 Maison de l'Inde", postalCode: '75014', town: 'PARIS 14EME', country: 'FRANCE' },
                  "7 Boulevard Jourdan\nCIUP - 403 Maison de l'Inde\n75014 PARIS 14EME\nFRANCE");
            check("3 rue Ursulines\nVilla Pasteur\nAppt. 207\n75005 PARIS 05EME\nFRANCE", 
                  { lines: '3 rue Ursulines', line2: 'Villa Pasteur - Appt. 207', postalCode: '75005', town: 'PARIS 05EME', country: 'FRANCE' },
                  "3 rue Ursulines\nVilla Pasteur - Appt. 207\n75005 PARIS 05EME\nFRANCE");
            check("25 CROCKERTON ROAD\nSW177HE LONDRES\nGRANDE BRETAGNE", 
                  { lines: "25 CROCKERTON ROAD\nSW177HE LONDRES", country: "GRANDE BRETAGNE" });
        });
        
    });
});
