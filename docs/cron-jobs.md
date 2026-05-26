# Tâches planifiées (cron) — ERP VIFAA

## Configuration

Dans `api/.env` :

```env
CRON_SECRET=changez-moi-en-production-long-et-aleatoire
```

Toutes les requêtes cron doivent envoyer l’en-tête :

```http
X-Cron-Secret: <valeur de CRON_SECRET>
```

L’URL de l’API en local : `http://localhost:3001` (voir `PORT` dans `.env`).

---

## 1. Renouvellement des soldes de congés (1ᵉʳ mai)

Crée les soldes de l’exercice mai → avril (30 j + jours reportés) pour **tous les employés actifs**.

**Endpoint :** `POST /cron/leave-renew-exercise`

### PowerShell (Windows — Planificateur de tâches)

```powershell
cd C:\dev\erp
.\scripts\cron-leave-renew.ps1 -ApiBaseUrl "http://localhost:3001" -CronSecret "votre-secret"
```

Variables d’environnement optionnelles : `ERP_API_URL`, `ERP_CRON_SECRET`.

### cURL

```bash
curl -X POST "http://localhost:3001/cron/leave-renew-exercise" \
  -H "X-Cron-Secret: votre-secret"
```

### GitHub Actions

Le workflow `.github/workflows/cron-leave-renewal.yml` peut être déclenché manuellement ou selon un cron (`0 6 1 5 *` = 1ᵉʳ mai à 06:00 UTC).

Secrets du dépôt :

| Secret | Description |
|--------|-------------|
| `ERP_API_URL` | URL publique de l’API (ex. `https://api.vifaa.example`) |
| `ERP_CRON_SECRET` | Même valeur que `CRON_SECRET` sur le serveur |

---

## 2. E-mails de notification

Les alertes in-app déclenchent aussi un e-mail si SMTP est configuré :

```env
MAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=erp@vifaa.example
FRONTEND_URL=http://localhost:5173
```

En développement, laissez `MAIL_ENABLED=false` (comportement par défaut).

---

## 3. Clôtures comptables mensuelles

Pas de cron : action manuelle dans l’interface **Trésorerie** (`/dashboard/tresorerie`) ou via :

`POST /treasury/accounting-periods/close` (JWT + permission `manage:AccountingPeriod`).
