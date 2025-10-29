import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://simple-react-todo-474513.ew.r.appspot.com'

const DEFAULT_FORM = { title: '', description: '' }

const STATUS_LABELS = {
  active: 'À faire',
  completed: 'Terminée',
  archived: 'Archivée',
}

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'À faire' },
  { id: 'completed', label: 'Terminées' },
  { id: 'archived', label: 'Archivées' },
]

const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

function App() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [formValues, setFormValues] = useState(DEFAULT_FORM)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imagePendingId, setImagePendingId] = useState('')
  const [uploadingTaskId, setUploadingTaskId] = useState('')
  const fileInputRef = useRef(null)

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return sortTasks(tasks)
    return sortTasks(tasks).filter((task) => task.status === filter)
  }, [tasks, filter])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`)
      if (!response.ok) {
        throw new Error("Impossible de charger les tâches.")
      }
      const data = await response.json()
      setTasks(sortTasks(data))
    } catch (err) {
      setError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null
    if (file && !file.type.startsWith('image/')) {
      setError('Seuls les fichiers images sont acceptés.')
      event.target.value = ''
      setSelectedImage(null)
      return
    }

    setError('')
    setSelectedImage(file)
  }

  const resetForm = () => {
    setFormValues(DEFAULT_FORM)
    setEditingTaskId(null)
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const upsertTask = (updatedTask) => {
    setTasks((prev) => {
      const exists = prev.some((task) => task.id === updatedTask.id)
      if (exists) {
        return sortTasks(prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
      }
      return sortTasks([updatedTask, ...prev])
    })
  }

  const uploadTaskImage = useCallback(async (taskId, file) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/images`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Impossible d'envoyer l'image.")
    }

    return response.json()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedTitle = formValues.title.trim()
    if (!trimmedTitle) {
      setError('Le titre est obligatoire pour créer une tâche.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        title: trimmedTitle,
        description: formValues.description.trim(),
      }

      let savedTask

      if (editingTaskId) {
        const response = await fetch(`${API_BASE_URL}/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          throw new Error("Impossible de mettre à jour la tâche.")
        }
        savedTask = await response.json()
      } else {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          throw new Error("Impossible de créer la tâche.")
        }
        savedTask = await response.json()
      }

      if (selectedImage) {
        setIsUploadingImage(true)
        try {
          savedTask = await uploadTaskImage(savedTask.id, selectedImage)
        } finally {
          setIsUploadingImage(false)
        }
      }

      upsertTask(savedTask)
      resetForm()
    } catch (err) {
      setError(err.message ?? 'Une erreur est survenue lors de la sauvegarde.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (task) => {
    setEditingTaskId(task.id)
    setFormValues({ title: task.title, description: task.description ?? '' })
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async (taskId, imageId) => {
    setError('')
    setImagePendingId(imageId)

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/images/${imageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error("Impossible de supprimer l'image.")
      }

      const updatedTask = await response.json()
      upsertTask(updatedTask)
    } catch (err) {
      setError(err.message ?? "Erreur lors de la suppression de l'image.")
    } finally {
      setImagePendingId('')
    }
  }

  const handleTaskImageUpload = async (taskId, event) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Seuls les fichiers images sont acceptés.')
      event.target.value = ''
      return
    }

    setError('')
    setUploadingTaskId(taskId)

    try {
      const updatedTask = await uploadTaskImage(taskId, file)
      upsertTask(updatedTask)
    } catch (err) {
      setError(err.message ?? "Impossible d'envoyer l'image.")
    } finally {
      setUploadingTaskId('')
      event.target.value = ''
    }
  }

  const handleStatusChange = async (taskId, nextStatus) => {
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!response.ok) {
        throw new Error("Impossible de modifier le statut de la tâche.")
      }
      const updatedTask = await response.json()
      upsertTask(updatedTask)
    } catch (err) {
      setError(err.message ?? 'Erreur lors de la mise à jour du statut.')
    }
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  const isFormBusy = isSubmitting || isUploadingImage

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Simple React Todo</p>
          <h1>Vos tâches en un coup d&apos;oeil</h1>
          <p className="page-subtitle">
            Ajoutez, organisez et clôturez vos actions quotidiennes en toute simplicité.
          </p>
        </div>
        <div className="page-counter">
          {tasks.length} {tasks.length > 1 ? 'tâches' : 'tâche'}
        </div>
      </header>

      <main className="layout">
        <section className="panel panel-form">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">{editingTaskId ? 'Modifier une tâche' : 'Nouvelle tâche'}</h2>
              <p className="panel-description">
                {editingTaskId
                  ? 'Mettez à jour les informations et ajoutez une image si nécessaire.'
                  : 'Décrivez rapidement ce que vous devez faire, puis passez à la suite.'}
              </p>
            </div>
            {editingTaskId && (
              <button type="button" className="btn ghost" onClick={handleCancelEdit} disabled={isFormBusy}>
                Annuler
              </button>
            )}
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span className="form-label">Titre</span>
              <input
                type="text"
                name="title"
                autoComplete="off"
                placeholder="Écrire le titre de la tâche"
                value={formValues.title}
                onChange={handleChange}
                disabled={isFormBusy}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Description</span>
              <textarea
                name="description"
                placeholder="Ajoutez des détails si besoin"
                value={formValues.description}
                onChange={handleChange}
                disabled={isFormBusy}
                rows={3}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Image (optionnelle)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isFormBusy}
              />
              {selectedImage ? (
                <span className="form-hint">Fichier sélectionné : {selectedImage.name}</span>
              ) : (
                <span className="form-hint">Formats acceptés : JPG, PNG, GIF.</span>
              )}
            </label>

            <button className="btn primary" type="submit" disabled={isFormBusy}>
              {isFormBusy ? 'Enregistrement…' : editingTaskId ? 'Mettre à jour' : 'Ajouter la tâche'}
            </button>
          </form>
        </section>

        <section className="panel panel-list">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Vos tâches</h2>
              <p className="panel-description">
                Filtrez par statut pour retrouver rapidement ce qui vous attend.
              </p>
            </div>
            <div className="filters">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`filter-chip ${filter === id ? 'filter-chip-active' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="notice notice-error">{error}</div>}

          {loading ? (
            <p className="empty-state">Chargement des tâches…</p>
          ) : filteredTasks.length === 0 ? (
            <p className="empty-state">Aucune tâche à afficher pour ce filtre.</p>
          ) : (
            <ul className="task-list">
              {filteredTasks.map((task) => {
                const createdAt = task.createdAt ? new Date(task.createdAt) : null
                const updatedAt = task.updatedAt ? new Date(task.updatedAt) : null
                return (
                  <li key={task.id} className={`task-card status-${task.status}`}>
                    <div className="task-card-header">
                      <div className="task-card-infos">
                        <h3>{task.title}</h3>
                        {task.description ? <p className="task-card-description">{task.description}</p> : null}
                      </div>
                      <span className={`task-status task-status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                    </div>

                    {task.images?.length ? (
                      <div className="task-gallery">
                        <p className="task-gallery-title">Fichiers liés</p>
                        <div className="task-gallery-grid">
                          {task.images.map((image) => (
                            <div className="task-gallery-item" key={image.id}>
                              {image.downloadUrl ? (
                                <img src={image.downloadUrl} alt={image.filename} />
                              ) : (
                                <div className="task-gallery-fallback">{image.filename}</div>
                              )}
                              <div className="task-gallery-actions">
                                {image.downloadUrl ? (
                                  <a
                                    className="icon-button"
                                    href={image.downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Ouvrir l'image dans un nouvel onglet"
                                  >
                                    <span className="sr-only">Ouvrir l&apos;image</span>
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="M14 3h7m0 0v7m0-7L10 14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M21 14v5a2 2 0 0 1-2 2h-5M10 3H5a2 2 0 0 0-2 2v5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  className="icon-button icon-button-danger"
                                  onClick={() => handleDeleteImage(task.id, image.id)}
                                  disabled={imagePendingId === image.id}
                                  aria-label={
                                    imagePendingId === image.id
                                      ? "Suppression de l'image en cours"
                                      : "Supprimer l'image"
                                  }
                                >
                                  <span className="sr-only">
                                    {imagePendingId === image.id
                                      ? "Suppression de l'image en cours"
                                      : "Supprimer l'image"}
                                  </span>
                                  {imagePendingId === image.id ? (
                                    <span aria-hidden className="icon-spinner" />
                                  ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <path
                                        d="M19 6L5 6"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                      />
                                      <path
                                        d="M9 6V4.5C9 3.67 9.67 3 10.5 3h3c.83 0 1.5.67 1.5 1.5V6M9.5 11v6m5-6v6m-8.5-11v14c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="task-upload">
                      <label
                        className={`btn ghost file-trigger ${uploadingTaskId === task.id ? 'file-trigger-disabled' : ''}`}
                      >
                        {uploadingTaskId === task.id ? 'Envoi en cours…' : 'Ajouter une image'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleTaskImageUpload(task.id, event)}
                          disabled={uploadingTaskId === task.id}
                        />
                      </label>
                    </div>

                    <div className="task-footer">
                      <div className="task-meta">
                        {createdAt && <span>Créée le {createdAt.toLocaleString('fr-FR')}</span>}
                        {updatedAt && updatedAt.getTime() !== createdAt?.getTime() ? (
                          <span>Modifiée le {updatedAt.toLocaleString('fr-FR')}</span>
                        ) : null}
                      </div>
                      <div className="task-actions">
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => handleEdit(task)}
                          disabled={isFormBusy}
                        >
                          Modifier
                        </button>
                        {task.status !== 'completed' && (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => handleStatusChange(task.id, 'completed')}
                          >
                            Terminer
                          </button>
                        )}
                        {task.status !== 'archived' && (
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => handleStatusChange(task.id, 'archived')}
                          >
                            Archiver
                          </button>
                        )}
                        {task.status !== 'active' && (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => handleStatusChange(task.id, 'active')}
                          >
                            Réactiver
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
