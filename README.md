# Présentation

comptex permet de demander/afficher des valeurs, d'effectuer des actions, avec gestion de workflows et de permissions.

Un workflow débute par une étape initiale.
* une étape initiale peut mener à une autre étape initiale : les valeurs sont ajoutées en paramètre dans l'URL (ou conserver en mémoire navigateur pour les valeurs sensibles comme les mots de passe)
* il est possible de pré-paramétrer avec des paramètres dans l'URL
* il est possible de forcer une authentification (avec `action_pre`) et de restreindre les personnes autorisées (avec `acls`)

Quand une demande nécessite de passer entre plusieurs personnes, un workflow débouche sur une étape suivante. L'URL contient l'id de la demande. Les personnes sont généralement prévenues par un mail contenant cette URL. 

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

## ```labels```

Most labels are Vue.js templates with variables:
* `v_pre`: the query parameters + the hidden parameters from previous browser step (when using `nextBrowserStep`)
* `v`: initially the value returned by `action_pre`, then the current value as modified by the user. Useful combined with `toUserOnly` attrs.

The labels:
* title: *(html)* title displayed on step page
* description: *(vue template)* displayed below title, before attrs
* post_scriptum: *(vue template)* displayed after the `<form>`
* title_in_list: *(html)* override `title` in list of steps.
* description_in_list: *(html)* override `description` in list of steps. Can be computed
* okButton: *(html)* for the button which submits the step page. If empty, no button is displayed (useful for information pages, with no `attrs`)
* cancelButton: *(html)* for the button which rejects a "next" step.

Labels which can use variable `resp` which is the response of "next" `action_pre` and/or step `action_post`:
* accepted: *(vue template)* displayed when the `action_post` succeeded (but see `added` below if there is a "next" step)
* added: *(vue template)* displayed when reaching this step (through `next`). It will be prefered over `accepted` above.


## ```attrs```

By default, the value is sent to the browser, and can be modified with potential restrictions:
* ```oneOf```: restricted list of possibilities (const + title list)
* ```oneOf_async```: similar to above but list is computed using user search (ie autocomplete, useful for long lists)
* ```pattern```: regexp the value sent by the browser must match
* ```allowedChars```: prefer this over `pattern` for simple cases since it can explain the user what is wrong
* ```min```: min number the value sent by the browser must match
* ```max```: max number the value sent by the browser must match
* ```minYear```: min year number the value sent by the browser must match (for dates)
* ```maxYear```: max year number the value sent by the browser must match (for dates)
* ```optional```: by default empty value is not allowed
* ```allowUnchangedValue```: if set, if the user changes the value, the value must pass checks. If kept unchanged, it bypasses checks!

* ```format```
* ```default```: default value
* ```uiType```: many choices
* ```items```: use this for arrays. It must contain options for array values
* ```properties```: use this for tabs. 
* ```width```: wanted image width (will get resized by the browser)
* ```ratio```: wanted image ratio (will get enforced by the browser)
* ```photo_quality```: wanted image quality

You can also ensure the browser does not modify the value:
* ```hidden```: not sent to the browser
* ```readOnly```: sent to the browser, but can not be modified by the browser
* ```toUserOnly```: sent to the browser, but can not be modified by the browser + do not propagate it to next steps (usage example: display it to the user, but do not propagate to createCompte)



You can customize the way it is displayed:
* ```uiHidden```: used with `readOnly` or `toUserOnly` to hide the `<input>`. Useful when you want to display the value in step `description`
* ```title```: (*text*) the `<label>`. Use [Unicode non-breaking space](https://en.wikipedia.org/wiki/Non-breaking_space) to force layout
* ```description```: *(html)* displayed below the `<input>`
* ```uiPlaceholder```: the `<input>` placeholder
* ```uiOptions.rows```: number of lines (uiType textarea)
* ```uiOptions.autocomplete```: enable localStorage history for uiType textarea
* ```uiOptions.title_rowspan```: allow title to span next titles
* ```uiOptions.title_hidden```: do not display the title
* ```uiOptions.allowOnelineForm```: WIP

* ```labels.advice```: displayed when the value is not valid
* ```labels.tooltip```: a "?" is displayed next to the `<label>`, click or hover it to display the tooltip message
* ```labels.warning```: similar to tooltip, but with a "warning" sign

Some special functionalities are only available through `shared/conf.ts`:
* ```normalize```: function called on the value. Example: use it to remove whitespace from the value
* ```formatting```: for `autocomplete`, used to format the value for the `<input>`
* ```formatting_html```: for `autocomplete`, used to format the value for the dropdown choices
* ```onChange```: when the value is modified by the user, can modify `v`
* ```validator```: custom validator. Use it when `pattern` is not enough, or to display an adapted error message
* ```minDate```: the value must be >= this date
* ```maxDate```: the value must be <= this date

Complex functionalities:

* if: condition for `then`
* then: attrs merge patch options

### ```merge_patch_parent_properties```

`then` and `oneOf` choices can have additional attrs options.


## ```attrs_override```

Similar to `attrs` but computed. Useful to customize allowed attributes based on loggued user, query parameters, or `action_pre` returned value.

## ```acls```

Some steps need to be restricted to admins/managers/moderators.

For simple cases, use `acl.user_id` or `acl.ldapGroup`.

More complex ACLs are possible. They need to provide 3 functions:
* (logged) user => an LDAP filter (that returns allowed `v`)
* (logged) user => a mongo filter (that returns allowed `v`)
* `v` => an LDAP filter (that will return allowed user)


# Authentication

If `.action_pre` or `.action_post` throws exception `Unauthorized`
* the API will return HTTP status 401 (cf server/utils.ts:respondJson)
* the javascript code will redirect to `/login/local?then=`*current step* (cf app/services/ws.ts)
* which will force CAS/Shibboleth authentication (cf "Apache shibboleth SP configuration" below)
* `/login/local` will return the Vue.js app (cf catch-all in server/start_server.ts)
* which will route to `query.then` (cf app/router.ts)
* the javascript will call API again, with the user now authenticated

# Attribute values in URL

You can set attribute values in the URL.
* `?sn=Rigaux` : forces the value, the field is fully hidden
* `?readOnly_sn=Rigaux` : forces the value, the field is readonly
* `?set_sn=Rigaux` : forces the value, the field is editable
* `?default_sn=Rigaux` : if the value is empty, sets the value.

NB : you can use the query part or the hash part of the URL (hash part is useful for long values to bypass URI length limitations)

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
