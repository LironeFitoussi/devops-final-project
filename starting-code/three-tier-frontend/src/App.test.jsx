import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './AuthContext'
import * as api from './api'

vi.mock('./api')

function renderApp(initialEntries = ['/']) {
  api.me.mockResolvedValue({ id: 1, name: 'Ada', email: 'a@b.com' })
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  // Safe defaults so any page mounted incidentally by routing (e.g. the
  // home route's PostsListPage during an unrelated test) doesn't crash on
  // an unmocked `undefined.then`.
  api.listPosts.mockResolvedValue([])
  api.listTools.mockResolvedValue([])
})

describe('App routing', () => {
  it('renders the posts list on the home route', async () => {
    api.listPosts.mockResolvedValue([
      {
        id: 1,
        title: 'Choosing Your First Chisel Set',
        author: 'Mara Holt',
        excerpt: 'A beginner guide.',
        created_at: '2026-01-01T00:00:00Z',
      },
    ])
    renderApp(['/'])

    expect(await screen.findByText('Choosing Your First Chisel Set')).toBeInTheDocument()
  })

  it('renders the tools list on /tools', async () => {
    api.listTools.mockResolvedValue([
      {
        id: 1,
        title: 'Vintage No. 4 Hand Plane',
        description: 'Restored.',
        price_cents: 8500,
        seller_name: 'Theo Ransome',
        image_url: null,
      },
    ])
    renderApp(['/tools'])

    expect(await screen.findByText('Vintage No. 4 Hand Plane')).toBeInTheDocument()
    expect(screen.getByText('$85.00')).toBeInTheDocument()
  })

  it('redirects an anonymous visitor from /write to /login', async () => {
    localStorage.clear()
    renderApp(['/write'])

    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Write a post' })).not.toBeInTheDocument()
  })

  it('shows the write-post form for a logged-in user', async () => {
    localStorage.setItem('woods-and-tools-token', 'tok-abc')
    renderApp(['/write'])

    expect(await screen.findByRole('heading', { name: 'Write a post' })).toBeInTheDocument()
  })
})
