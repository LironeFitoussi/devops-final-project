import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPost } from './api'
import ImageEmbed from './ImageEmbed'

export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    setStatus('loading')
    getPost(id)
      .then((data) => {
        setPost(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [id])

  if (status === 'loading') return <p className="status">Loading post…</p>
  if (status === 'error') return <p className="status status-error">{error}</p>

  return (
    <article className="post-detail">
      <Link to="/" className="back-link">
        ← Back to all posts
      </Link>
      <h2>{post.title}</h2>
      <p className="meta">
        By {post.author} · {new Date(post.created_at).toLocaleDateString()}
      </p>
      <ImageEmbed url={post.image_url} alt={post.title} />
      <p className="content">{post.content}</p>
    </article>
  )
}
