import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { createPost } from './api'

export default function WritePostPage() {
  const { user, token, authLoading } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (authLoading) return <p className="status">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const post = await createPost(token, {
        title,
        excerpt,
        content,
        image_url: imageUrl || null,
      })
      navigate(`/posts/${post.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-form">
      <h2>Write a post</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Excerpt
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={300}
            required
          />
        </label>
        <label>
          Content
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
        </label>
        <label>
          Image URL (optional)
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </label>

        {error && <p className="status status-error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish post'}
        </button>
      </form>
    </div>
  )
}
