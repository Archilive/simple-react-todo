// Mock Firebase Admin SDK before loading the app.
jest.mock('firebase-admin', () => {
  const collectionMock = {
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], size: 0 }),
    add: jest.fn(),
  }

  const firestoreMock = jest.fn(() => ({
    collection: jest.fn(() => collectionMock),
  }))

  firestoreMock.FieldValue = {
    serverTimestamp: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
  }

  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: firestoreMock,
    credential: {
      cert: jest.fn(),
    },
  }
})

jest.mock('../s3Service', () => ({
  isConfigured: jest.fn(() => false),
  getDownloadUrl: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}))

const request = require('supertest')
const { app } = require('../server')

describe('API Endpoints', () => {
  it('GET /healthz should return 200 OK', async () => {
    const res = await request(app).get('/healthz')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })

  it('GET /tasks should return empty list initially (mocked)', async () => {
    const res = await request(app).get('/tasks')
    expect(res.statusCode).toEqual(200)
    expect(Array.isArray(res.body)).toBeTruthy()
    expect(res.body).toHaveLength(0)
  })

  it('GET /metrics/basic should expose counters', async () => {
    const res = await request(app).get('/metrics/basic')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveProperty('total', 0)
    expect(res.body).toHaveProperty('active', 0)
    expect(res.body).toHaveProperty('completed', 0)
    expect(res.body).toHaveProperty('archived', 0)
  })
})
