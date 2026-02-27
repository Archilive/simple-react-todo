import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

global.fetch = vi.fn()

function createFetchResponse(data) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  }
}

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockReset()
  })

  it('renders the main title', async () => {
    fetch.mockResolvedValue(createFetchResponse([]))

    render(<App />)

    expect(await screen.findByText(/Vos tâches en un coup d'oeil/i)).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    let resolveRequest
    const delayedRequest = new Promise((resolve) => {
      resolveRequest = resolve
    })

    fetch.mockReturnValue(delayedRequest)

    render(<App />)

    expect(screen.getByText(/Chargement des tâches/i)).toBeInTheDocument()

    resolveRequest(createFetchResponse([]))

    await waitForElementToBeRemoved(() => screen.queryByText(/Chargement des tâches/i))
  })
})
