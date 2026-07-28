import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { createTool } from './api'

export default function SellToolPage() {
  const { user, token, authLoading } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (authLoading) return <p className="status">Loading…</p>
  if (!user) return <Navigate to="/login" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const priceCents = Math.round(parseFloat(price) * 100)
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Enter a valid price greater than 0.')
      return
    }
    setBusy(true)
    try {
      await createTool(token, {
        title,
        description,
        price_cents: priceCents,
        image_url: imageUrl || null,
      })
      navigate('/tools')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-form">
      <h2>Sell a tool</h2>
      <p className="form-note">
        Listing only — no checkout or payment processing in this demo.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
          />
        </label>
        <label>
          Price (USD)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label>
          Image URL (optional)
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </label>

        {error && <p className="status status-error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Publishing…' : 'List tool for sale'}
        </button>
      </form>
    </div>
  )
}
