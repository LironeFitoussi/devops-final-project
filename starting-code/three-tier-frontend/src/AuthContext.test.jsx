import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'
import * as api from './api'

vi.mock('./api')

function Probe() {
  const { user, token, login, register, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'anonymous'}</span>
      <span data-testid="token">{token || 'no-token'}</span>
      <button onClick={() => login('a@b.com', 'pw')}>login</button>
      <button onClick={() => register('a@b.com', 'A', 'pw')}>register</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  // api.me is called by the token-validation effect any time `token` changes;
  // default it to a benign resolution so tests that don't care about it
  // (e.g. asserting on login/logout) don't hit an unmocked `undefined.then`.
  api.me.mockResolvedValue({ id: 1, name: 'Ada', email: 'a@b.com' })
})

describe('AuthContext', () => {
  it('starts logged out with no stored token', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
  })

  it('login stores the token and user, and persists to localStorage', async () => {
    api.login.mockResolvedValue({
      access_token: 'tok-abc',
      user: { id: 1, name: 'Ada', email: 'a@b.com' },
    })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-abc'))
    expect(screen.getByTestId('user')).toHaveTextContent('Ada')
    expect(localStorage.getItem('woods-and-tools-token')).toBe('tok-abc')
  })

  it('logout clears state and localStorage', async () => {
    api.login.mockResolvedValue({
      access_token: 'tok-abc',
      user: { id: 1, name: 'Ada', email: 'a@b.com' },
    })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('tok-abc'))

    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous')
    expect(localStorage.getItem('woods-and-tools-token')).toBeNull()
  })

  it('clears a stale token if /auth/me rejects it', async () => {
    localStorage.setItem('woods-and-tools-token', 'stale-token')
    api.me.mockRejectedValue(new Error('401 Unauthorized'))

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('no-token'))
    expect(localStorage.getItem('woods-and-tools-token')).toBeNull()
  })
})
