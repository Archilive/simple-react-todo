# Monitoring et Observabilité

## 1. Frontend - Google Cloud Monitoring

Sources:
- App Engine request logs
- Latence HTTP
- Taux d'erreur 4xx/5xx

Dashboard recommandé:
- Requêtes/minute
- Latence p95
- Erreurs 5xx

Alerte recommandée:
- `5xx > 5%` sur 5 minutes.

## 2. Backend - AWS CloudWatch

Sources:
- Logs applicatifs App Runner
- Métriques CPU/Mémoire App Runner
- Statut healthcheck `/healthz`

Logs structurés:
- Le backend journalise chaque requête avec `method`, `path`, `status`, `durationMs`.

Endpoint technique:
- `GET /metrics/basic` expose un résumé du nombre de tâches (`total`, `active`, `completed`, `archived`).

Alertes recommandées:
- CPU > 80% pendant 10 min
- Erreurs 5xx > 5% pendant 5 min
- healthcheck KO 3 fois consécutives

## 3. KPI soutenance

- Disponibilité API (uptime)
- Temps de réponse moyen/p95
- Taux d'erreur
- Volume de tâches et d'uploads
