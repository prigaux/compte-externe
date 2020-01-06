# Installation

```sh
# for initscript
npm install -g forever

# for tests with phantomjs
apt-get install git-core bzip2 make

npm install
```

# Steps Workflow

NB: any exception (thrown in ```action_pre``` for example) will stop current request and leave the database unchanged.

## ```GET /comptes/```

If ```GET /comptes/new/:step```
* create empty sv with sv.step = :step
* ```.action_pre``` is called with params (req, empty sv)

If ```GET /comptes/:id/:step```
* read sv from database

With current sv.step:
* ```.acls``` is used to check authenticated user is allowed
* ```sv.attrs``` is assigned from ```.attrs``` merged with optional ```.attrs_override``` (computed using req and current sv)
* ```sv.v``` is filtered using ```.attrs```

It returns sv

## ```PUT /comptes/```

If ```PUT /comptes/new/:step```
* create empty sv with sv.step = :step
* ```.action_pre``` is called with params (req, empty sv)

If ```PUT /comptes/:id/:step```
* read sv from database

With current sv.step:
* ```.acls``` is used to check authenticated user is allowed
* ```.attrs``` is used to update sv.v using PUT body
* ```.v.id``` is created if missing
* ```.action_post``` is called with params (req, sv)
* ```.notify.accepted``` template is mailed to moderators (moderators computed from ```.acls```)
* ```.next``` step is the new sv.step

If sv.step is not null, with new sv.step:
* ```.action_pre``` is called with params (req, sv)
* sv is saved in database
* ```.notify.added``` template is mailed to moderators (moderators computed from ```.acls```)

If sv.step is null, sv is removed from database

It returns { success: true, step: xxx, ... action_pre || action_post response }

## ```DELETE /comptes/```

Read sv from database
* ```.acls``` is used to check authenticated user is allowed
* ```.notify.rejected``` template is mailed to moderators (moderators computed from ```.acls```)

# Steps configuration

## ```attrs```

By default, the value is sent to the browser, and can be modified with potential restrictions:
* ```oneOf```: restricted list of possibilities (const + title list)
* ```pattern```: regexp the value sent by the browser must match
* ```max```: max number the value sent by the browser must match

You can also ensure the browser does not modify the value:
* ```hidden```: not sent to the browser
* ```readOnly```: sent to the browser, but can not be modified by the browser
* ```toUserOnly```: sent to the browser, but can not be modified by the browser + do not propagate it to next steps (usage example: display it to the user, but do not propagate to createCompte)

## ```acls```

TODO

# Authentication

If `.action_pre` or `.action_post` throws exception `Unauthorized`
* the API will return HTTP status 401 (cf server/utils.ts:respondJson)
* the javascript code will redirect to `/login/local?then=`*current step* (cf app/services/ws.ts)
* which will force shibboleth authentication (cf "Apache shibboleth SP configuration" below)
* `/login/local` will return the Vue.js app (cf catch-all in server/start_server.ts)
* which will route to `query.then` (cf app/router.ts)
* the javascript will call API again, with the user now authenticated

# Configuration

## Apache shibboleth SP configuration

```apache
<Location />
  Authtype shibboleth
  require shibboleth
  ShibRequestSetting requireSession 0
  ShibUseHeaders On
</Location>

<LocationMatch .*/login/(local|extern)$>
  require valid-user
  ShibRequireSession On
</LocationMatch>

<LocationMatch .*/login/local$>
  ShibRequestSetting entityID https://idp.univ.fr
</LocationMatch>
```

When using Shibboleth authentication, you should protect against CSRF using:
```xml
<Sessions ... cookieProps="; path=/; HttpOnly; Secure; SameSite=lax">
```