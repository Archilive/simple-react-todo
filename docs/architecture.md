# Architecture Cloud

## Vue d'ensemble

- Frontend public: App Engine (`front` service)
- API: AWS App Runner
- Données applicatives: Firestore (`tasks`)
- Fichiers images: AWS S3 (bucket privé + URLs signées)

## Flux principal

1. L'utilisateur ouvre l'UI React sur App Engine.
2. Le frontend appelle l'API App Runner.
3. Le backend lit/écrit les tâches dans Firestore.
4. Les images sont uploadées sur S3.
5. L'API renvoie des URLs signées temporaires pour téléchargement.

## Scalabilité

- App Engine: autoscaling horizontal (`min_instances=0`, `max_instances=3`).
- App Runner: autoscaling géré par AWS.
- Firestore et S3: services managés scalables nativement.

## Résilience

- Services managés multi-zone (Firestore/S3/App Runner/App Engine).
- API stateless, redéployable sans perte.
- Données externalisées (pas de stockage local persistant).

## Sécurité de base

- Secrets via variables d'environnement/Secrets Manager.
- Bucket S3 privé + URLs signées courtes.
- CORS restreint via `CORS_ORIGINS` côté backend.
- IAM minimal (least privilege) sur AWS et GCP.
