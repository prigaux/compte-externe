# Installation

```sh
# for initscript
npm install -g forever

# for ldapjs & phantomjs
apt-get install git-core bzip2 make

npm install
```

# Steps Workflow

NB: any exception (thrown in ```action_pre``` for example) will stop current request and leave the database unchanged.

## ```GET /comptes/```

If ```GET /comptes/new/:step```
* create empty sv with sv.step = :step
* ```.action_pre``` is called with params (req, empty sv)

If ```GET /comptes/:id```
* read sv from database

With current sv.step:
* ```.acls``` is used to compute/update sv.moderators which is checked against authenticated user

It returns { step, attrs, v }

## ```PUT /comptes/```

If ```PUT /comptes/new/:step```
* create empty sv with sv.step = :step
* ```.action_pre``` is called with params (req, empty sv)

If ```PUT /comptes/:id```
* read sv from database

With current sv.step:
* ```.acls``` is used to compute/update sv.moderators which is checked against authenticated user
* ```.attrs``` is used to update sv.v using PUT body
* ```.action_post``` is called with params (req, sv)
* ```.notify.accepted``` template is mailed to sv.moderators
* ```.next``` step is the new sv.step

If sv.step is not null, with new sv.step:
* ```.action_pre``` is called with params (req, sv)
* ```.acls``` is used to compute sv.moderators
  * special ```_AUTO_MODERATE_``` moderator implies going straight to next step
* sv is saved in database
* ```.notify.added``` template is mailed to sv.moderators

If sv.step is null, sv is removed from database

It returns { success: true, step: xxx, ... action_pre || action_post response }

## ```DELETE /comptes/```

Read sv from database
* sv.moderators are checked against authenticated user
* ```.notify.rejected``` template is mailed to sv.moderators

# Steps configuration

## ```attrs```

By default, the value is sent to the browser, and can be modified with potential restrictions:
* ```choices```: restricted list of possbilities (key + name list)
* ```pattern```: regexp the value sent by the browser must match
* ```max```: max number the value sent by the browser must match

You can also ensure the browser does not modify the value:
* ```hidden```: not sent to the browser
* ```readonly```: sent to the browser, but can not be modified by the browser
* ```toUserOnly```: sent to the browser, but can not be modified by the browser + do not propagate it to next steps (usage example: display it to the user, but do not propagate to createCompte)

## ```acls```

TODO


# Configuration

## Apache shibboleth SP configuration

```apache
<Location />
  Authtype shibboleth
  require shibboleth
  ShibRequestSetting requireSession 0
  ShibUseHeaders On
</Location>

<LocationMatch ^/(moderate|create/federation|create/cas)>
  require valid-user
  ShibRequireSession On
</LocationMatch>

<LocationMatch ^/(create/cas)>
  ShibRequestSetting entityID https://idp.univ.fr
</LocationMatch>
```
