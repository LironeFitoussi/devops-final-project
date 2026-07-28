import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPosts } from './api'

export default function PostsListPage() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    listPosts()
      .then((data) => {
        setPosts(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  if (status === 'loading') return <p className="status">Loading posts…</p>
  if (status === 'error') {
    return (
      <p className="status status-error">
        Couldn't reach the backend ({error}). Is it running at{' '}
        <code>{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code>?
      </p>
    )
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.id} className="post-card">
          <h2>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </h2>
          <p className="meta">
            By {post.author} · {new Date(post.created_at).toLocaleDateString()}
          </p>
          <p className="excerpt">{post.excerpt}</p>
          <Link to={`/posts/${post.id}`} className="read-more">
            Read more →
          </Link>
        </li>
      ))}
    </ul>
  )
}
