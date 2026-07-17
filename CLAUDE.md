Cette application sera un erp avec une maison mère qui sera unique du nom de VIFAA et des filiales qui seront rattachès à elle.

Pose moi toujours la questions lorsque tu veux utiliser des pattern qui de base ne sont pas used dans l'application afin que j'approuve.

## Hierarchie

La maison mère est divisée en **pôles** avec des rôles distincts. Il existera plusieurs rôles par pôle et certains pôles pourront dépendre d'autres.

Pôles :

- Pole_OPERATIONS
- Pole_STRATEGY_DEVELOPMENT
- Pole_FINANCE
- Pole_LEGAL
- Pole_ARCHITECTURE_HERITAGE
- Pole_MARKETING_COMMUNICATION
- Pole_PRODUCTION
- Pole_HR

Chaque pôle a un directeur (`DIRECTOR_*`) ; on peut créer des rôles assistants. Rôles transverses sans pôle : **ADMIN**, **DIRECTOR_GENERAL**.

## Role 

Il existe des rôles liés à la maison mère :

 - ADMIN : l'administrateur qui a droit a tout.
 - DIRECTOR_GENERAL : Directeur général.
 - DIRECTOR_OPERATIONS : Directeur opération.
 - DIRECTOR_STRATEGY_DEVELOPMENT : Directeur stratégie et développement.
 - DIRECTOR_FINANCE : Directeur des finances.
 - DIRECTOR_LEGAL : Directeur des affaires juridiques.
 - DIRECTOR_ARCHITECTURE_HERITAGE : Directrice de l'architecture et du patrimoine.
 - DIRECTOR_MARKETING_COMMUNICATION : Directrice du marketing, du développement et de la communication.
 - DIRECTOR_PRODUCTION : Directeur production.
 - DIRECTOR_HR : Directeur des ressources humaines.

Lorsqu'on lance la base de données on vérifie toujours que ces rôles et pôles existent.

On utilisera un RBAC et des permissions qui sont liées à ces rôles avec CASL.

## Actions valides

```
read | create | update | delete | manage
```

---

Tous les directeurs de pôle peuvent "read" (via permission `read:all` seedée) selon le périmètre pôle côté API.
Les rôles ADMIN, DIRECTOR_GENERAL et DIRECTOR_OPERATIONS peuvent tout "manage" et voient tous les pôles.

Les autres utilisateurs maison mère ne voient que **leur pôle** (sauf ADMIN / DG / OPS).

On a la possibilité de créer de nouveaux rôles pour les sociétés de filiations et leur donner un certain nombre de permission. CASL prendra en compte les permissions en fonction des rôles et filtera les différentes requêtes entrantes pour ainsi savoir qui peut faire quoi.

Un rôle **sans** permissions en base = **aucun** droit (deny-by-default), pas de lecture large implicite.

## Utilisateurs , permissons et rôles.

Chaque utilisateur a forcément un role et est forcément associé a une société ; à la maison mère le pôle vient du rôle.
Ceux de la maison mère ont accès à toutes les filiations et peuvent agir en fonction des permissions qu'ils ont.
Ceux des filiales ne peuvent voir que ce qui se passe dans leur societé sans voir ce qui se passe ailleur et peuvent agir en fonction des permissions qu'ils ont mais seulement dans leur société.

Au niveau du frontend on n'affichera que ce que la personne connectée a droit en fonction de rôle, sa société et ses permissions.

## Table de la base donnée
a chaque fois vérifier la table de données et mettre a jour les permissions pour que les utilisateurs concernées puissent l'utiliser correctement.

## Budget
Le buget est crée et validé avec des lignes budgetaires nommées par la maison mère.
Je veux aussi saisir les sorties ( loyer, salaires...).
