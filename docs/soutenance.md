# Trame de soutenance (15-20 min)

## 1. Contexte et objectifs (2 min)

- Besoin: Todo full-stack cloud-native.
- Contraintes: multi-cloud, CI/CD, observabilité.

## 2. Architecture choisie (4 min)

- Front App Engine (GCP)
- Back App Runner (AWS)
- Firestore + S3
- Justification: séparation responsabilités, services managés, scalabilité native.

## 3. Démonstration applicative (4 min)

- Création/modification/suppression de tâche
- Upload image
- Filtrage et statuts
- Vérification persistance Firestore + S3

## 4. CI/CD (3 min)

- Déclenchement sur push/PR
- Tests + builds
- Déploiement backend AWS puis frontend GCP
- Gestion des secrets GitHub Actions

## 5. Monitoring/Logs (3 min)

- Dashboard GCP (front)
- Dashboard CloudWatch (back)
- Exemple de log structuré et endpoint `/metrics/basic`

## 6. Limites et améliorations (2 min)

- Ajout Terraform (IaC)
- Ajout auth utilisateur (JWT/Firebase Auth)
- Load testing (k6)
- Autoscaling avancé et budget alerts
