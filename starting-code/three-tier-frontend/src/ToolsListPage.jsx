import { useEffect, useState } from 'react'
import { listTools } from './api'
import ImageEmbed from './ImageEmbed'

function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function ToolsListPage() {
  const [tools, setTools] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    listTools()
      .then((data) => {
        setTools(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  if (status === 'loading') return <p className="status">Loading tools…</p>
  if (status === 'error') return <p className="status status-error">{error}</p>
  if (tools.length === 0) return <p className="status">No tools listed yet.</p>

  return (
    <ul className="tool-list">
      {tools.map((tool) => (
        <li key={tool.id} className="tool-card">
          <ImageEmbed url={tool.image_url} alt={tool.title} />
          <div className="tool-card-body">
            <h2>{tool.title}</h2>
            <p className="price">{formatPrice(tool.price_cents)}</p>
            <p className="meta">Sold by {tool.seller_name}</p>
            <p className="excerpt">{tool.description}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
