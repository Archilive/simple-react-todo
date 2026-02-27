# Frontend - Todo Cloud Native

Frontend React/Vite servi par Express (`server.js`) pour un déploiement App Engine Standard.

## Scripts

```bash
npm run dev      # développement local
npm run build    # build production (dist/)
npm run start    # sert dist/ en production
npm run test     # tests Vitest
```

## Variables d'environnement

Créez un `.env.local` à partir de `.env.example` :

```bash
VITE_API_BASE_URL=https://your-backend-url.awsapprunner.com
```

## Déploiement App Engine

```bash
npm ci
VITE_API_BASE_URL=https://your-backend-url.awsapprunner.com npm run build
gcloud app deploy app.yaml --project <gcp-project-id>
```
