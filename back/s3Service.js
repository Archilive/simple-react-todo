const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const pickEnv = (...keys) => {
  for (const key of keys) {
    if (process.env[key]) {
      return { key, value: process.env[key] }
    }
  }
  return { key: null, value: undefined }
}

const { value: bucket } = pickEnv('AWS_S3_BUCKET', 'S3_BUCKET', 'BUCKET_NAME')
const { value: region } = pickEnv('AWS_REGION', 'AWS_DEFAULT_REGION', 'AWS_S3_REGION')
const { value: endpoint } = pickEnv('AWS_S3_ENDPOINT', 'S3_ENDPOINT', 'AWS_ENDPOINT_URL_S3')

const hasStaticCredentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY

const staticCredentials = hasStaticCredentials
  ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    }
  : undefined

const missingVars = [
  bucket ? null : 'AWS_S3_BUCKET',
  region ? null : 'AWS_REGION',
].filter(Boolean)

const isConfigured = missingVars.length === 0

if (!isConfigured) {
  console.warn(
    `[S3] Configuration incomplète. Variables manquantes: ${missingVars.join(', ')}. ` +
      "Définissez les variables d'environnement nécessaires (ou créez un fichier .env).",
  )
}

const s3Client = isConfigured
  ? new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      ...(staticCredentials ? { credentials: staticCredentials } : {}),
    })
  : null

const assertConfigured = () => {
  if (!isConfigured || !s3Client || !bucket) {
    throw new Error("Le stockage S3 n'est pas correctement configuré.")
  }
}

const uploadImage = async ({ key, body, contentType }) => {
  assertConfigured()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType ?? 'application/octet-stream',
  })

  await s3Client.send(command)
}

const deleteImage = async (key) => {
  assertConfigured()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await s3Client.send(command)
}

const getDownloadUrl = async (key, expiresIn = 900) => {
  assertConfigured()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

module.exports = {
  isConfigured: () => isConfigured,
  uploadImage,
  deleteImage,
  getDownloadUrl,
}
