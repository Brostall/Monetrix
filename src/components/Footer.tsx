import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const Footer = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const handlePolicyClick = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: 'security' } })
      return
    }

    const el = document.querySelector<HTMLElement>('#security')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.pathname, navigate])

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Link to="/" className="brand" aria-label="Monetrix — вернуться на главную">
          <span className="brand-mark">M</span>
          <span className="brand-name">Monetrix</span>
        </Link>
        <p className="footer-copy">© {new Date().getFullYear()} Monetrix. Все права защищены.</p>
        <div className="footer-links">
          <a href="mailto:hello@monetrix.app">Связаться</a>
          <a href="https://disk.yandex.ru" target="_blank" rel="noreferrer">
            Презентация
          </a>
          <button className="footer-link-button" type="button" onClick={handlePolicyClick}>
            Политика ИБ
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer

