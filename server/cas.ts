import * as express from 'express';
import * as cas from 'connect-cas';
import * as conf from './conf';
import * as utils from './utils';
import { get_delete } from './helpers';


const chain = (mdw1: express.RequestHandler, mdw2: express.RequestHandler) : express.RequestHandler => (
    (req, res, next) => {
        mdw1(req, res, () => {
            mdw2(req, res, next)
        })
    }
);

const fake_host = (mdw: express.RequestHandler): express.RequestHandler => (
    (req, res, next) => {
        // HACK: "host" is now in an url part /o\
        req.headers.host = conf.mainUrl.replace(/^https:\/\//, '');
        return mdw(req, res, next);
    }
);

const cas_express_auth = (req: req, _res, next) => {
    const id = req.session && req.session.cas && req.session.cas.user;
    if (id) req.user = { id };
    next();
}

export const init = (app) => {
    // an express session store is needed to store logged user
    app.use(utils.session_store());
    
    cas.configure(conf.cas);

    const pgtUrl = '/login/cas_pgtCallback';
    app.get(pgtUrl, fake_host(cas.serviceValidate({ pgtUrl })))
    app.get("/login/cas_with_pgt", fake_host(chain(cas.serviceValidate({ pgtUrl }), cas.authenticate())));
    app.get("/login/cas", fake_host(chain(cas.serviceValidate(), cas.authenticate())));
    app.use(cas_express_auth);
}

export const get_proxy_ticket = (req: req, targetService: string): Promise<string> => (
    new Promise((resolve, reject) => {
        if (!conf.cas.host) {
            reject("Internal error: you must configure cas.host in server/conf.ts (for get_proxy_ticket)");
        }
        if (!req.session || !req.session.pgt) {
            reject({ code: "Unauthorized", authenticate: { type: "cas_with_pgt" } });
        }
        cas.proxyTicket({ targetService })(req, undefined, () => {
            const pt = get_delete(req.session.pt, targetService); // we will use it, and PT are usually NOT reusable
            if (pt) resolve(pt); else reject("internal error: no proxy ticket");
        });
    })
)

export function logout(req) {
    if (!req.session) {
    } else if (req.session.destroy) {
        // Forget our own login session
        req.session.destroy();
    } else {
        // Cookie-based sessions have no destroy()
        req.session = null;
    }
}
