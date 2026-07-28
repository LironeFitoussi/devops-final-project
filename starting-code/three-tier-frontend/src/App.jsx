import { Route, Routes } from 'react-router-dom'
import NavBar from './NavBar'
import PostsListPage from './PostsListPage'
import PostDetailPage from './PostDetailPage'
import ToolsListPage from './ToolsListPage'
import WritePostPage from './WritePostPage'
import SellToolPage from './SellToolPage'
import AuthView from './AuthView'
import './App.css'

function App() {
  return (
    <div className="page">
      <header className="site-header">
        <NavBar />
        <p className="tagline">Notes from the workshop — hand tools, joinery, and shop safety.</p>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<PostsListPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/tools" element={<ToolsListPage />} />
          <Route path="/write" element={<WritePostPage />} />
          <Route path="/sell" element={<SellToolPage />} />
          <Route path="/login" element={<AuthView initialMode="login" />} />
          <Route path="/register" element={<AuthView initialMode="register" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
