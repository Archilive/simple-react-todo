import express from 'express'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import serveStatic from 'serve-static'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const distPath = path.join(__dirname, 'dist')

if (!fs.existsSync(distPath)) {
  console.warn('Le dossier dist est introuvable. Exécutez "npm run build" avant de lancer le serveur.')
}

app.use(
  serveStatic(distPath, {
    index: ['index.html'],
    maxAge: '1h',
  })
)

app.use((_, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Frontend disponible sur le port ${port}`)
})
