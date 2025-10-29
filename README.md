# Todo List full-stack (Vite + Firebase + App Engine)

Cette application fournit une todo list complète avec un frontend React (Vite) et un backend Node/Express connecté à Firebase (Firestore). L’infrastructure est prête à être déployée sur Google Cloud App Engine en deux services :

- **Service par défaut** : le frontend React servi via Express.
- **Service `api`** : l’API REST qui manipule les tâches dans Firestore.

## Architecture

```
./front   → Vite + React (JS) + Express pour servir le build
./back    → Express + Firebase Admin SDK (Firestore)
```

Chaque tâche possède un titre, une description optionnelle ainsi qu’un statut (`active`, `completed`, `archived`). Le frontend permet d’ajouter, modifier, terminer, archiver et réactiver des tâches.

## Prérequis

- Node.js 18 ou supérieur
- `npm`
- Un projet Google Cloud avec App Engine et Firestore activés
- Le SDK Google Cloud (`gcloud`) installé et authentifié (`gcloud auth login`)
- Pour le développement local : des identifiants Firebase (service account) ou l’authentification ADC (`gcloud auth application-default login`)

## Configuration Firebase

1. Dans la console Firebase / Google Cloud, créez une base Firestore en mode production.
2. (Option local) Créez une clé de compte de service avec le rôle *Firestore Owner* et exportez le chemin du fichier JSON :
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/chemin/vers/service-account.json"
   ```
   Vous pouvez aussi utiliser `gcloud auth application-default login` pour générer des identifiants temporaires.
3. Si votre projet possède plusieurs bases Firestore (ex. `simple-todo`) ou que la base par défaut est en mode Datastore, indiquez l’identifiant de la base à utiliser :
   ```bash
   export FIRESTORE_DATABASE_ID="simple-todo"
   ```
   Vous pourrez également définir cette variable dans App Engine via `env_variables`.

## Installation des dépendances

```bash
cd back
npm install

cd ../front
npm install
```

## Développement local

1. **Backend**
   ```bash
   cd back
   npm run dev       # lance nodemon sur http://localhost:8080
   ```
2. **Frontend**
   ```bash
   cd front
   cp .env.example .env.development   # modifiez si besoin
   npm run dev       # lance Vite sur http://localhost:5173
   ```
   Le frontend consomme l’API via `VITE_API_BASE_URL` (par défaut `http://localhost:8080`).

## Déploiement sur App Engine

### 1. Backend (`api`)

```bash
cd back
# Optionnel : définir des variables d’environnement si besoin
# gcloud app deploy utilisera npm start

gcloud app deploy app.yaml --project <ID_PROJET>
```

L’URL du service aura la forme `https://api-dot-<ID_PROJET>.appspot.com`.

### 2. Frontend (service par défaut)

1. Indiquez l’URL publique de l’API dans la configuration de build :
   ```bash
   cd front
   cp .env.production.example .env.production
   # remplacez <ID_PROJET> par votre identifiant GCP puis sauvegardez
   ```
2. Déployez :
   ```bash
   gcloud app deploy app.yaml --project <ID_PROJET>
   ```

Le script `gcp-build` déclenchera automatiquement `npm run build` avant la mise en ligne. L’application sera disponible sur `https://<ID_PROJET>.appspot.com`.

### (Optionnel) Routage personnalisé

Si vous préférez servir l’API sur le même domaine que le frontend (ex. `/api`), ajoutez un fichier `dispatch.yaml` à la racine du dépôt :
```yaml
dispatch:
  - url: "*/api/*"
    service: api
  - url: "*/*"
    service: default
```
Puis déployez-le :
```bash
gcloud app deploy dispatch.yaml --project <ID_PROJET>
```
Le frontend pourra alors pointer `VITE_API_BASE_URL` vers `https://<ID_PROJET>.appspot.com/api`.

## Points importants

- `back/server.js` utilise les identifiants d’application par défaut pour se connecter à Firestore. Assurez-vous que le compte de service App Engine possède au minimum le rôle *Cloud Datastore User*.
- Le backend expose les routes :
  - `GET /tasks`
  - `POST /tasks`
  - `PATCH /tasks/:id`
  - `DELETE /tasks/:id`
  - `GET /healthz`
- Le frontend s’appuie sur `fetch` et gère l’affichage de manière optimiste (mise à jour locale après chaque opération).
- Pensez à configurer les règles de sécurité Firestore adaptées à votre contexte si vous ouvrez l’API publiquement.

Bon déploiement !
