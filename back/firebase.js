const admin = require('firebase-admin')

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error('La variable FIREBASE_SERVICE_ACCOUNT_JSON doit contenir un JSON valide.')
  }
}

const initializeFirebase = () => {
  if (admin.apps.length) {
    return admin
  }

  const serviceAccount = parseServiceAccount()

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    return admin
  }

  admin.initializeApp()
  return admin
}

module.exports = {
  initializeFirebase,
}
