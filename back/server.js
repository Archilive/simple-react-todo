const express = require('express')
const cors = require('cors')
const crypto = require('node:crypto')
const multer = require('multer')
const admin = require('firebase-admin')

const s3Service = require('./s3Service')

if (!admin.apps.length) {
  admin.initializeApp()
}

const { FieldValue } = admin.firestore
const db = admin.firestore()
const tasksCollection = db.collection('tasks')
const app = express()

app.use(cors())
app.use(express.json())

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const STATUS_VALUES = new Set(['active', 'completed', 'archived'])

const sanitizeFilename = (name = 'image') =>
  name
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(-128) || 'image'

const mapTaskBase = (doc) => {
  const data = doc.data()
  const images = Array.isArray(data.images) ? data.images : []
  return {
    id: doc.id,
    title: data.title,
    description: data.description ?? '',
    status: data.status ?? 'active',
    createdAt: data.createdAt?.toDate().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate().toISOString() ?? null,
    images,
  }
}

const enrichImages = async (task) => {
  if (!task.images.length) {
    return { ...task, images: [] }
  }

  const canSign = s3Service.isConfigured()
  const images = await Promise.all(
    task.images.map(async (imageMeta) => {
      if (!canSign) {
        return { ...imageMeta, downloadUrl: null }
      }

      try {
        const downloadUrl = await s3Service.getDownloadUrl(imageMeta.key)
        return { ...imageMeta, downloadUrl }
      } catch (error) {
        console.error(`Erreur lors de la génération du lien signé pour ${imageMeta.key}:`, error)
        return { ...imageMeta, downloadUrl: null }
      }
    }),
  )

  return { ...task, images }
}

const serializeTask = async (doc) => {
  const task = mapTaskBase(doc)
  return enrichImages(task)
}

const validatePayload = (payload, { partial = false } = {}) => {
  const errors = []
  const updates = {}

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    if (payload.title !== undefined) {
      if (typeof payload.title !== 'string' || !payload.title.trim()) {
        errors.push('Le titre doit être une chaîne non vide.')
      } else {
        updates.title = payload.title.trim()
      }
    } else if (!partial) {
      errors.push('Le titre est obligatoire.')
    }
  }

  if (payload.description !== undefined) {
    if (typeof payload.description !== 'string') {
      errors.push('La description doit être une chaîne de caractères.')
    } else {
      updates.description = payload.description.trim()
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status !== 'string' || !STATUS_VALUES.has(payload.status)) {
      errors.push('Statut invalide (active, completed, archived).')
    } else {
      updates.status = payload.status
    }
  }

  return { errors, updates }
}

app.get('/healthz', (_, res) => {
  res.json({ status: 'ok' })
})

app.get('/tasks', async (req, res) => {
  try {
    const snapshot = await tasksCollection.orderBy('createdAt', 'desc').get()
    const tasks = await Promise.all(snapshot.docs.map(serializeTask))
    res.json(tasks)
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error)
    res.status(500).json({ message: "Impossible de récupérer les tâches." })
  }
})

app.post('/tasks', async (req, res) => {
  const { errors, updates } = validatePayload(req.body)
  if (errors.length) {
    return res.status(400).json({ message: errors.join(' ') })
  }

  const now = FieldValue.serverTimestamp()
  const data = {
    title: updates.title,
    description: updates.description ?? '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    images: [],
  }

  try {
    const docRef = await tasksCollection.add(data)
    const newDoc = await docRef.get()
    res.status(201).json(await serializeTask(newDoc))
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error)
    res.status(500).json({ message: "Impossible de créer la tâche." })
  }
})

app.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params
  const { errors, updates } = validatePayload(req.body, { partial: true })
  if (errors.length) {
    return res.status(400).json({ message: errors.join(' ') })
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Aucune donnée à mettre à jour.' })
  }

  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    await docRef.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    const updatedDoc = await docRef.get()
    res.json(await serializeTask(updatedDoc))
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error)
    res.status(500).json({ message: "Impossible de mettre à jour la tâche." })
  }
})

app.post('/tasks/:id/images', upload.single('image'), async (req, res) => {
  if (!s3Service.isConfigured()) {
    return res
      .status(500)
      .json({ message: 'Le stockage S3 est indisponible. Vérifiez la configuration des variables.' })
  }

  const { id } = req.params
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier image reçu.' })
  }

  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    const filename = sanitizeFilename(req.file.originalname)
    const imageId = crypto.randomUUID()
    const key = `tasks/${id}/${imageId}-${filename}`

    await s3Service.uploadImage({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream',
    })

    const imageMeta = {
      id: imageId,
      key,
      filename,
      size: req.file.size,
      contentType: req.file.mimetype || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }

    await docRef.update({
      images: FieldValue.arrayUnion(imageMeta),
      updatedAt: FieldValue.serverTimestamp(),
    })

    const updatedDoc = await docRef.get()
    res.status(201).json(await serializeTask(updatedDoc))
  } catch (error) {
    console.error('Erreur lors de l’upload de l’image:', error)
    res.status(500).json({ message: "Impossible d'ajouter l'image à la tâche." })
  }
})

app.get('/tasks/:id/images', async (req, res) => {
  const { id } = req.params

  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    const task = await serializeTask(snapshot)
    res.json(task.images)
  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error)
    res.status(500).json({ message: "Impossible de récupérer les images." })
  }
})

app.get('/tasks/:id/images/:imageId/download', async (req, res) => {
  const { id, imageId } = req.params

  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    const data = snapshot.data()
    const images = Array.isArray(data.images) ? data.images : []
    const image = images.find((item) => item.id === imageId)

    if (!image) {
      return res.status(404).json({ message: 'Image introuvable pour cette tâche.' })
    }

    if (!s3Service.isConfigured()) {
      return res
        .status(500)
        .json({ message: 'Le stockage S3 est indisponible. Vérifiez la configuration des variables.' })
    }

    const downloadUrl = await s3Service.getDownloadUrl(image.key)
    res.json({ url: downloadUrl })
  } catch (error) {
    console.error('Erreur lors de la génération du lien de téléchargement:', error)
    res.status(500).json({ message: "Impossible de générer le lien de téléchargement." })
  }
})

app.delete('/tasks/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = req.params

  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    const data = snapshot.data()
    const images = Array.isArray(data.images) ? data.images : []
    const image = images.find((item) => item.id === imageId)

    if (!image) {
      return res.status(404).json({ message: 'Image introuvable pour cette tâche.' })
    }

    if (!s3Service.isConfigured()) {
      return res
        .status(500)
        .json({ message: 'Le stockage S3 est indisponible. Vérifiez la configuration des variables.' })
    }

    await s3Service.deleteImage(image.key)

    await docRef.update({
      images: FieldValue.arrayRemove(image),
      updatedAt: FieldValue.serverTimestamp(),
    })

    const updatedDoc = await docRef.get()
    res.json(await serializeTask(updatedDoc))
  } catch (error) {
    console.error("Erreur lors de la suppression de l'image:", error)
    res.status(500).json({ message: "Impossible de supprimer l'image." })
  }
})

app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params
  try {
    const docRef = tasksCollection.doc(id)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Tâche introuvable.' })
    }

    const data = snapshot.data()
    const images = Array.isArray(data.images) ? data.images : []

    if (images.length && !s3Service.isConfigured()) {
      return res.status(500).json({
        message: 'Stockage S3 indisponible. Impossible de supprimer les images associées à la tâche.',
      })
    }

    for (const image of images) {
      try {
        await s3Service.deleteImage(image.key)
      } catch (error) {
        console.error(`Erreur lors de la suppression de ${image.key} sur S3:`, error)
        return res.status(500).json({ message: "Impossible de supprimer les images associées à la tâche." })
      }
    }

    await docRef.delete()
    res.status(204).send()
  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error)
    res.status(500).json({ message: "Impossible de supprimer la tâche." })
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`API Todo démarrée sur le port ${PORT}`)
})
