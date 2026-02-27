# Déploiement

## A. Backend (AWS App Runner)

### 1. Préparer AWS

- Créer un repository ECR.
- Créer un bucket S3 privé.
- Créer un service App Runner connecté à l'image ECR.
- Attacher un rôle IAM au service App Runner avec droits:
  - `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` sur le bucket.

### 2. Configurer les variables backend dans App Runner

- `PORT=8080`
- `GOOGLE_CLOUD_PROJECT=<gcp-project-id>`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<json du compte de service Firebase>`
- `AWS_REGION=<region aws>`
- `AWS_S3_BUCKET=<bucket>`
- `CORS_ORIGINS=<url front app engine>,http://localhost:5173`

### 3. Déployer

Automatique via GitHub Actions (`deploy-backend-aws`) ou manuellement:

```bash
cd back
docker build -t todo-backend .
```

Puis push sur ECR et déclencher un `start-deployment` App Runner.

## B. Frontend (Google App Engine)

### 1. Préparer GCP

- Créer/activer un projet GCP.
- Activer App Engine (région `europe-west`).
- Créer un service account de déploiement avec permissions App Engine.

### 2. Build local ou CI

```bash
cd front
npm ci
VITE_API_BASE_URL=https://your-backend-url.awsapprunner.com npm run build
```

### 3. Déployer

```bash
gcloud app deploy app.yaml --project <gcp-project-id>
```

## C. Variante backend GCP (optionnelle)

Si demandé par le jury, le backend peut être containerisé et déployé sur Cloud Run en réutilisant le même Dockerfile.
