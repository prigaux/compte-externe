# Exemples

* [Cabine photographique](#cabine-photographique)
* [Homonymes](#homonymes)
* [Divers](#divers)
* [Champs conditionnels](#champs-conditionnels)

## Cabine photographique

[![](exemples/photobooth.webp)](https://raw.githubusercontent.com/UnivParis1/comptex/master/docs/exemples/photobooth.webp)

## Homonymes

* Présentation des homonymes trouvés :
![](exemples/homonymes.png)

* Après clic sur « C'est la même personne » le workflow continue avec un message d'avertissement :
![](exemples/homonyme-fusion.png)

## Divers

![](exemples/mon-compte.png)

## Champs conditionnels

Selon le choix « Demander à l'invité de remplir » ou « Remplir moi-même »
![](exemples/champ-conditionnel.png)
![](exemples/champ-conditionnel2.png)

```typescript
        oneOf: [ 
            { const: "yes", title: "Demander à l'invité de remplir", 
              merge_patch_parent_properties: {  
                  supannMailPerso: {  
                      title: "Email de la personne", 
                      description: "<br>Un mél va être envoyé à l'invité lui demandant de remplir ses informations personnelles (nom, prénom, date de naissance, coordonnées).", 
                  }, 
                 } }, 
            { const: "no", title: "Remplir moi-même",  
              merge_patch_parent_properties: perso_attrs }, 
        ],
```