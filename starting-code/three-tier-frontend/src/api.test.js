import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPosts, createPost, login, register } from './api'

function mockFetch(status, body) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    json: async () => body,
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  it('listPosts performs a plain GET with no auth header', async () => {
    mockFetch(200, [{ id: 1, title: 'Hello' }])
    const posts = await listPosts()
    expect(posts).toEqual([{ id: 1, title: 'Hello' }])
    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('createPost sends a Bearer token and JSON body', async () => {
    mockFetch(201, { id: 2, title: 'New post' })
    const result = await createPost('tok123', { title: 'New post' })
    expect(result.id).toBe(2)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/posts')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer tok123')
    expect(JSON.parse(options.body)).toEqual({ title: 'New post' })
  })

  it('login surfaces the backend detail message on failure', async () => {
    mockFetch(401, { detail: 'Invalid email or password' })
    await expect(login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    )
  })

  it('register surfaces a generic status message when there is no JSON detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('not json')
      },
    })
    await expect(register({ email: 'a@b.com', name: 'A', password: 'x' })).rejects.toThrow(
      '500 Internal Server Error',
    )
  })
})
