import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems: Array<{ label: string; target: string }> = [
  { label: 'Возможности', target: 'features' },
  { label: 'Как работает', target: 'workflow' },
  { label: 'Тарифы', target: 'pricing' },
  { label: 'Безопасность', target: 'security' },
]

const Topbar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = useCallback(
    (target: string) => {
      const selector = `#${target}`
      if (location.pathname !== '/') {
        navigate('/', { state: { scrollTo: target } })
        return
      }

      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [location.pathname, navigate],
  )

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/" className="brand" aria-label="Monetrix — вернуться на главную">
          <span className="brand-mark">M</span>
          <span className="brand-name">Monetrix</span>
        </Link>

        <nav className="nav-links" aria-label="Основная навигация">
          {navItems.map((item) => (
            <button key={item.target} className="nav-link-button" type="button" onClick={() => handleNavClick(item.target)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <a className="btn ghost-btn" href="https://yadi.sk" target="_blank" rel="noreferrer">
            Документация
          </a>
          {location.pathname.startsWith('/client') ? (
            <button
              className="btn ghost-btn"
              type="button"
              onClick={() => {
                navigate('/', { replace: true })
              }}
            >
              Выйти
            </button>
          ) : (
            <>
              <Link className="btn ghost-btn" to="/login">
                Войти
              </Link>
              <Link className="btn primary-btn" to="/register">
                Зарегистрироваться
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar

