# Référence des permissions (CASL / Prisma)

Ce document liste les **noms de permissions** utilisables en base (`Permission.name`), alignés sur les contrôleurs Nest et le module CASL (`api/src/casl/define-ability.ts`). Tu peux t’en servir pour créer les entrées en base et pour refléter les droits côté front (menu, boutons).

---

## Format en base de données

- Table **`Permission`** : champ **`name`** = chaîne au format **`action:Subject`**
  - `action` : `read` | `create` | `update` | `delete` | `manage` (minuscules après parsing)
  - `Subject` : identifiant **exact** du sujet CASL (voir tableaux ci‑dessous), ou `all` pour un wildcard
- Liaison rôle ↔ permission : **`PermissionRole`** (`roleId`, `permissionId`)
- Rôle **`ADMIN`**, **`DIRECTOR_GENERAL`**, **`DIRECTOR_OPERATIONS`** : accès **`manage:all`** côté code (les lignes `Permission` sont ignorées pour ces rôles)

### Wildcards

| Nom en base        | Effet |
|--------------------|--------|
| `read:all`         | Lecture sur **tous** les sujets listés dans `KNOWN_POLICY_SUBJECTS` |
| `manage:all`       | Toutes actions sur **tous** ces sujets |
| `create:all`, `update:all`, `delete:all` | Idem pour l’action indiquée |

En CASL, **`manage`** sur un sujet couvre en général **read, create, update, delete** pour les vérifications `ability.can(action, subject)`.

---

## Modèles Prisma concernés

| Modèle Prisma      | Rôle |
|--------------------|------|
| `Permission`       | Définition d’une permission (`name` = `action:Subject`) |
| `Role`             | Rôle utilisateur |
| `PermissionRole`   | N‑N rôle ↔ permission |
| `User`             | `roleId` → rôle dont hérite les permissions |

Les **Subject** ci‑dessous ne sont pas tous des tables Prisma homonymes : ce sont des **libellés métier CASL** (ex. `Vente`, pas le modèle `Vente` renommé autrement).

---

## Actions valides

```
read | create | update | delete | manage
```

---

## Sujets connus (`KNOWN_POLICY_SUBJECTS`)

Ordre aligné sur `api/src/casl/define-ability.ts` :

`User`, `Organization`, `Role`, `Pole`, `Permission`, `AuditLog`, `LoginAttempt`, `Category`, `Product`, `Stock`, `StockOrder`, `Supplier`, `Budget`, `BudgetExpense`, `Department`, `Employee`, `LeaveRequest`, `LeaveBalance`, `EmploymentContract`, `EmployeeSalary`

---

## Ressources humaines (`HrController`, préfixe `/hr`)

Auth / rôles / permissions restent sur **`User`**. Les employés métier sont dans **`Employee`** (lien optionnel `Employee.userId`).

### Rôle `DIRECTOR_HR` (pôle `Pole_HR`)

Au démarrage (seeder) : **`read:all`** + CRUD explicite sur tous les sujets RH ci‑dessous.

### Department

| Permission | Route HTTP (indicative) |
|------------|-------------------------|
| `read:Department` | `GET /hr/departments`, `GET /hr/departments/:id` |
| `create:Department` | `POST /hr/departments` |
| `update:Department` | `PATCH /hr/departments/:id` |
| `delete:Department` | `DELETE /hr/departments/:id` |

Corps `POST` : `{ "name": string, "organizationId"?: uuid }` — `organizationId` **obligatoire** pour un utilisateur maison mère ; imposé au JWT pour une filiale.

### Employee

| Permission | Route HTTP |
|------------|------------|
| `read:Employee` | `GET /hr/employees`, `GET /hr/employees/:id` |
| `create:Employee` | `POST /hr/employees` |
| `update:Employee` | `PATCH /hr/employees/:id` |
| `delete:Employee` | `DELETE /hr/employees/:id` |

Champs principaux : `firstName`, `lastName`, `hireDate`, `status` (`ACTIVE` \| `INACTIVE` \| `SUSPENDED` \| `TERMINATED`), `departmentId`, `managerId`, `userId` (lien compte), `organizationId` (maison mère).

### LeaveRequest

| Permission | Route HTTP |
|------------|------------|
| `read:LeaveRequest` | `GET /hr/leave-requests`, `GET /hr/leave-requests/:id` |
| `create:LeaveRequest` | `POST /hr/leave-requests` |
| `update:LeaveRequest` | `PATCH /hr/leave-requests/:id/status` |
| `delete:LeaveRequest` | `DELETE /hr/leave-requests/:id` |

`PATCH …/status` : `{ "status": "APPROVED" \| "REJECTED" \| "CANCELLED" }` (uniquement si demande `PENDING`).

### LeaveBalance

| Permission | Route HTTP |
|------------|------------|
| `read:LeaveBalance` | `GET /hr/leave-balances`, `GET /hr/leave-balances/:id` |
| `create:LeaveBalance` | `POST /hr/leave-balances` |
| `update:LeaveBalance` | `PATCH /hr/leave-balances/:id` |
| `delete:LeaveBalance` | `DELETE /hr/leave-balances/:id` |

### EmploymentContract

| Permission | Route HTTP |
|------------|------------|
| `read:EmploymentContract` | `GET /hr/contracts`, `GET /hr/contracts/:id` (`?employeeId=`) |
| `create:EmploymentContract` | `POST /hr/contracts` |
| `update:EmploymentContract` | `PATCH /hr/contracts/:id` |
| `delete:EmploymentContract` | `DELETE /hr/contracts/:id` |

Types contrat : `CDI`, `CDD`, `STAGE`, `INTERIM`, `OTHER`. Statuts : `ACTIVE`, `EXPIRED`, `TERMINATED`.

### EmployeeSalary

| Permission | Route HTTP |
|------------|------------|
| `read:EmployeeSalary` | `GET /hr/salaries`, `GET /hr/salaries/:id` (`?employeeId=`) |
| `create:EmployeeSalary` | `POST /hr/salaries` |
| `update:EmployeeSalary` | `PATCH /hr/salaries/:id` |
| `delete:EmployeeSalary` | `DELETE /hr/salaries/:id` |

Montants en **`Decimal`** (FCFA), champs `amount`, `effectiveFrom`, `effectiveTo?`.

### Périmètre organisation (RH)

| Utilisateur | Liste / lecture | Création |
|-------------|-----------------|----------|
| Maison mère | Toutes orgs (filtre vide) | `organizationId` requis dans le body |
| Filiale | Uniquement `organisationId` du JWT | `organizationId` = org du JWT |

### Pagination (listes GET `/hr/*`)

Toutes les routes **liste** renvoient :

```json
{
  "items": [ /* … */ ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

| Query | Défaut | Max | Description |
|-------|--------|-----|-------------|
| `page` | `1` | — | Numéro de page (≥ 1) |
| `limit` | `20` | **20** | Éléments par page |
| `search` | — | — | Uniquement `GET /hr/employees` (nom, prénom, email) |
| `employeeId` | — | — | `GET /hr/contracts`, `GET /hr/salaries` |

Exemples : `GET /hr/employees?page=2&limit=20&search=dupont`, `GET /hr/departments?page=1`.

---

## Matrice recommandée (noms `Permission.name` à créer)

Pour chaque ligne, le nom exact à stocker est **`action:Subject`**. Les routes HTTP listées sont indicatives (préfixe API selon ton `globalPrefix`).

### User

| Permission     | Usage typique |
|----------------|----------------|
| `read:User`    | Liste / détail utilisateurs |
| `create:User`  | Création utilisateur |
| `update:User`  | Mise à jour utilisateur |
| `delete:User`  | Suppression utilisateur |

### Organization

| Permission        | Usage typique |
|-------------------|----------------|
| `read:Organization`   | Liste orgs, détail, `GET …/catalog` |
| `create:Organization` | Création filiale |
| `update:Organization` | MAJ org, utilisateurs org, **`PUT …/catalog`** (catalogue filiale) |
| `delete:Organization` | Suppression org |

### Role

| Permission     | Usage typique |
|----------------|----------------|
| `read:Role`    | Liste / détail rôles |
| `create:Role`  | Création rôle |
| `update:Role`  | MAJ rôle |
| `delete:Role`  | Suppression rôle |

### Permission (méta-permissions)

| Permission         | Usage typique |
|--------------------|----------------|
| `read:Permission`  | Catalogue / détail permissions |
| `create:Permission`| Création permission |
| `update:Permission`| MAJ permission, liaison rôle-permission |
| `delete:Permission`| Suppression permission |

### Category

| Permission       | Usage typique |
|------------------|----------------|
| `read:Category`  | Liste / détail catégories |
| `create:Category`| Création (réservé maison mère côté service) |
| `update:Category`| MAJ (idem) |
| `delete:Category`| Suppression (idem) |

### Product

| Permission       | Usage typique |
|------------------|----------------|
| `read:Product`   | Liste / détail / QR produit |
| `create:Product` | Création (réservé maison mère côté service) |
| `update:Product` | MAJ (idem) |
| `delete:Product` | Suppression (idem) |

### Stock

| Permission       | Usage typique |
|------------------|----------------|
| `read:Stock`     | Liste / détail / par org-produit |
| `create:Stock`   | Création stock |
| `update:Stock`   | MAJ stock, upsert |
| `delete:Stock`   | Suppression |

### Vente

| Permission       | Usage typique |
|------------------|----------------|
| `read:Vente`     | Liste / détail ventes |
| `create:Vente`   | Création vente |
| `update:Vente`   | MAJ vente |
| `delete:Vente`   | Suppression vente |

### VenteLine

| Permission          | Usage typique |
|---------------------|----------------|
| `read:VenteLine`    | Lignes par vente / détail |
| `create:VenteLine`  | Ajout ligne |
| `update:VenteLine`  | MAJ ligne |
| `delete:VenteLine`  | Suppression ligne |

### VentePaiement

| Permission             | Usage typique |
|------------------------|----------------|
| `read:VentePaiement`   | Lecture paiements |
| `create:VentePaiement` | Ajout paiement |
| `update:VentePaiement` | MAJ paiement |
| `delete:VentePaiement` | Suppression paiement |

### SessionCaisse

| Permission            | Usage typique |
|-----------------------|----------------|
| `read:SessionCaisse`  | Liste / détail sessions |
| `create:SessionCaisse`| Ouverture session |
| `update:SessionCaisse`| MAJ / clôture |
| `delete:SessionCaisse`| Suppression |

### Contrat

| Permission        | Usage typique |
|-------------------|----------------|
| `read:Contrat`    | Liste / détail |
| `create:Contrat`  | Création |
| `update:Contrat`  | MAJ |
| `delete:Contrat`  | Suppression |

### PlanningShift

| Permission            | Usage typique |
|-----------------------|----------------|
| `read:PlanningShift`  | Liste / détail / par org / par user |
| `create:PlanningShift`| Création |
| `update:PlanningShift`| MAJ |
| `delete:PlanningShift`| Suppression |

### Pointage

| Permission        | Usage typique |
|-------------------|----------------|
| `read:Pointage`   | Liste / détail / par user |
| `create:Pointage` | Création |
| `update:Pointage` | MAJ |
| `delete:Pointage` | Suppression |

### Absence

| Permission        | Usage typique |
|-------------------|----------------|
| `read:Absence`    | Liste / détail |
| `create:Absence`  | Création |
| `update:Absence`| MAJ |
| `delete:Absence`  | Suppression |

### BulletinPaie

| Permission           | Usage typique |
|----------------------|----------------|
| `read:BulletinPaie`  | Liste / détail |
| `create:BulletinPaie`| Création |
| `update:BulletinPaie`| MAJ |
| `delete:BulletinPaie`| Suppression |

### BulletinPaieLigne

| Permission                | Usage typique |
|---------------------------|----------------|
| `read:BulletinPaieLigne`  | Liste / détail |
| `create:BulletinPaieLigne`| Création |
| `update:BulletinPaieLigne`| MAJ |
| `delete:BulletinPaieLigne`| Suppression |

### AuditLog

| Permission      | Usage typique |
|-----------------|---------------|
| `read:AuditLog` | Consultation journal d’audit (toutes routes lecture) |

### LoginAttempt

| Permission          | Usage typique |
|---------------------|---------------|
| `read:LoginAttempt` | Consultation tentatives de connexion |

---

## Liste plate (copier-coller pour seeds / scripts)

Une permission par ligne, champ `name` :

```
read:User
create:User
update:User
delete:User
read:Organization
create:Organization
update:Organization
delete:Organization
read:Role
create:Role
update:Role
delete:Role
read:Permission
create:Permission
update:Permission
delete:Permission
read:AuditLog
read:LoginAttempt
read:Category
create:Category
update:Category
delete:Category
read:Product
create:Product
update:Product
delete:Product
read:Stock
create:Stock
update:Stock
delete:Stock
read:StockOrder
create:StockOrder
update:StockOrder
delete:StockOrder
read:Supplier
create:Supplier
update:Supplier
delete:Supplier
read:Budget
create:Budget
update:Budget
delete:Budget
read:BudgetExpense
create:BudgetExpense
update:BudgetExpense
delete:BudgetExpense
read:Department
create:Department
update:Department
delete:Department
read:Employee
create:Employee
update:Employee
delete:Employee
read:LeaveRequest
create:LeaveRequest
update:LeaveRequest
delete:LeaveRequest
read:LeaveBalance
create:LeaveBalance
update:LeaveBalance
delete:LeaveBalance
read:EmploymentContract
create:EmploymentContract
update:EmploymentContract
delete:EmploymentContract
read:EmployeeSalary
create:EmployeeSalary
update:EmployeeSalary
delete:EmployeeSalary
read:all
manage:all
```

*(Liste canonique du seed : `api/src/seeder/casl-permission-names.ts`.)*

*(Tu n’es pas obligé de tout créer en base : seules les permissions réellement liées aux rôles sont appliquées.)*

---

## Côté front (rappel)

- `GET /auth/me` renvoie `permissionMode` et `permissions` (noms bruts identiques à `Permission.name`).
- Le fichier `front/src/lib/me-ability.ts` définit les sujets utilisés pour le **menu** ; garde les mêmes chaînes `Subject` que dans ce document.
- Rôles dont le **nom** contient `caissier` (sans tenir compte de la casse) ajoutent **en plus** `read:Product`, `read:Category`, `read` / `create` / `update` sur `SessionCaisse` (voir `back/src/casl/checkout-role.ts`) — ce ne sont pas des lignes en base ; utile lorsque le rôle a déjà des permissions explicites (sinon le fallback `read:all` suffit). `delete:SessionCaisse` n’est pas inclus (gestion / admin via permissions liées au rôle).

---

## Règles complémentaires (hors seule granularité CASL)

Même avec la permission, le service peut refuser l’action :

| Règle | Détail |
|--------|--------|
| Périmètre organisation | Filiales : données limitées à `organisationId` du JWT (ventes, stocks, etc.) |
| Maison mère seule | Création / MAJ / suppression **produits** et **catégories** ; gestion **catalogue filiale** (`PUT /organisation/:id/catalog`) |
| Catalogue produits filiale | Produits visibles = `offeredToSubsidiaries` + éventuellement **catalogue par org** (catégories / produits liés) |
| Rôles full access | `ADMIN`, `DIRECTOR_GENERAL`, `DIRECTOR_OPERATIONS` → tout voir / tout faire côté API métier (sauf garde spécifique type `FullAccessRoleGuard` sur les permissions) |
| Directeur RH | `DIRECTOR_HR` → `read:all` + CRUD RH (seeder) ; pôle `Pole_HR` |

---

## Fichiers source à jour

- Catalogue seed : `api/src/seeder/casl-permission-names.ts`
- Sujets et parsing : `api/src/casl/define-ability.ts` (`KNOWN_POLICY_SUBJECTS`, `parsePermissionName`)
- Décorateurs sur les routes : `api/src/**/*.controller.ts` (`@CheckPolicies`)
- RH : `api/src/hr/hr.controller.ts`
- Profil exposé au front : `api/src/auth/auth.service.ts` (`getMeProfile`)
- Tests e2e RH : `api/test/hr.e2e-spec.ts`

En cas de nouveau contrôleur sécurisé par CASL, ajoute le **Subject** dans `KNOWN_POLICY_SUBJECTS` et complète ce document.
