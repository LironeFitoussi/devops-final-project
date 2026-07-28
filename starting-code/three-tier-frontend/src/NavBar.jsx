import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav-bar">
      <NavLink to="/" className="brand" end>
        Woods &amp; Tools
      </NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Posts
        </NavLink>
        <NavLink to="/tools" className={({ isActive }) => (isActive ? 'active' : '')}>
          Tools
        </NavLink>
        {user && (
          <>
            <NavLink to="/write" className={({ isActive }) => (isActive ? 'active' : '')}>
              Write a post
            </NavLink>
            <NavLink to="/sell" className={({ isActive }) => (isActive ? 'active' : '')}>
              Sell a tool
            </NavLink>
          </>
        )}
      </div>
      <div className="nav-auth">
        {user ? (
          <>
            <span className="nav-user">Hi, {user.name}</span>
            <button className="link-button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
              Log in
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : '')}>
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  )
}
