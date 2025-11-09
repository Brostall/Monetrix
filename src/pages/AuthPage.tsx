import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'
import { login, registerBusiness, registerIndividual } from '../lib/api'
import { getToken, saveToken } from '../lib/authStorage'

type AuthMode = 'login' | 'register'
type UserType = 'individual' | 'business'

const titles: Record<AuthMode, { heading: string; subheading: string }> = {
  login: {
    heading: 'Войдите в Monetrix',
    subheading: 'Продолжайте работать с финансовыми потоками, прогнозами и рекомендациями.',
  },
  register: {
    heading: 'Создайте аккаунт Monetrix',
    subheading: 'Заполните данные и подключите банки через OAuth 2.0 / ГОСТ-шлюз уже сегодня.',
  },
}

const userTypeLabels: Record<UserType, { badge: string; description: string }> = {
  individual: {
    badge: 'Для физических лиц',
    description: 'Следите за личными финансами, целями, бюджетами и рекомендациями от AI-советника.',
  },
  business: {
    badge: 'Для предпринимателей и ИП',
    description: 'Консолидируйте расчётные счета, стройте cashflow-планирование и отправляйте отчётность партнёрам.',
  },
}

type FieldConfig = {
  name: string
  label: string
  type: string
  placeholder?: string
  autoComplete?: string
}

const BANK_CLIENT_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const suffix = index + 1
  const value = `team217-${suffix}`
  return { value, label: `${value} (клиент ${suffix})` }
})

const getFieldConfig = (mode: AuthMode, userType: UserType): FieldConfig[] => {
  if (mode === 'login') {
    return userType === 'business'
      ? [
          { name: 'organization', label: 'Организация / ИНН', type: 'text', placeholder: 'ООО «Монетрикс»', autoComplete: 'organization' },
          { name: 'email', label: 'Рабочий e-mail', type: 'email', placeholder: 'founder@company.ru', autoComplete: 'email' },
          { name: 'password', label: 'Пароль', type: 'password', placeholder: 'Введите пароль', autoComplete: 'current-password' },
        ]
      : [
          { name: 'email', label: 'E-mail', type: 'email', placeholder: 'name@email.ru', autoComplete: 'email' },
          { name: 'password', label: 'Пароль', type: 'password', placeholder: 'Введите пароль', autoComplete: 'current-password' },
        ]
  }

  if (userType === 'business') {
    return [
      { name: 'companyName', label: 'Название компании', type: 'text', placeholder: 'ООО «Монетрикс»', autoComplete: 'organization' },
      { name: 'inn', label: 'ИНН', type: 'text', placeholder: '7708123456', autoComplete: 'on' },
      { name: 'contact', label: 'Контактное лицо', type: 'text', placeholder: 'Иван Иванов', autoComplete: 'name' },
      { name: 'email', label: 'Рабочий e-mail', type: 'email', placeholder: 'founder@company.ru', autoComplete: 'email' },
      { name: 'password', label: 'Пароль', type: 'password', placeholder: 'Придумайте пароль', autoComplete: 'new-password' },
      { name: 'confirm', label: 'Подтверждение пароля', type: 'password', placeholder: 'Повторите пароль', autoComplete: 'new-password' },
    ]
  }

  return [
    { name: 'fullName', label: 'ФИО', type: 'text', placeholder: 'Иван Иванов', autoComplete: 'name' },
    { name: 'email', label: 'E-mail', type: 'email', placeholder: 'name@email.ru', autoComplete: 'email' },
    { name: 'password', label: 'Пароль', type: 'password', placeholder: 'Придумайте пароль', autoComplete: 'new-password' },
    { name: 'confirm', label: 'Подтверждение пароля', type: 'password', placeholder: 'Повторите пароль', autoComplete: 'new-password' },
  ]
}

const AuthPage = ({ mode }: { mode: AuthMode }) => {
  const [userType, setUserType] = useState<UserType>('individual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const existingToken = getToken()
    if (existingToken) {
      navigate('/client', { replace: true })
    }
  }, [navigate])

  const fields = useMemo(() => getFieldConfig(mode, userType), [mode, userType])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    const bankClientId = formData.get('bankClientId')?.toString() || undefined

    try {
      setLoading(true)

      if (mode === 'register') {
        const password = formData.get('password')?.toString() ?? ''
        const confirm = formData.get('confirm')?.toString() ?? ''
        if (password !== confirm) {
          throw new Error('Пароли не совпадают')
        }

        const email = formData.get('email')?.toString() ?? ''
        if (userType === 'business') {
          const companyName = formData.get('companyName')?.toString() ?? ''
          const inn = formData.get('inn')?.toString() ?? ''
          const contact = formData.get('contact')?.toString() ?? ''
          const response = await registerBusiness({ companyName, inn, contact, email, password, bankClientId })
          saveToken(response.accessToken)
        } else {
          const fullName = formData.get('fullName')?.toString() ?? ''
          const response = await registerIndividual({ fullName, email, password, bankClientId })
          saveToken(response.accessToken)
        }
      } else {
        const email = formData.get('email')?.toString() ?? ''
        const password = formData.get('password')?.toString() ?? ''
        const response = await login({ userType, email, password })
        saveToken(response.accessToken)
      }

      navigate('/client', { replace: true })
    } catch (apiError) {
      if (apiError instanceof Error) {
        setError(apiError.message)
      } else {
        setError('Не удалось выполнить запрос. Попробуйте ещё раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="auth-main">
        <div className="container auth-layout">
          <div className="auth-intro">
            <span className="badge">Monetrix {userType === 'business' ? 'для бизнеса' : 'для физических лиц'}</span>
            <h1>{titles[mode].heading}</h1>
            <p className="auth-subtitle">{titles[mode].subheading}</p>

            <ul className="auth-benefits">
              <li>Подключение банков через OAuth 2.0 и ГОСТ-шлюз менее чем за 3 минуты.</li>
              <li>Гибкие бюджеты, AI-рекомендации и экспорт отчётов в PDF и Мой Офис.</li>
              <li>Безопасное хранение токенов, соответствие стандартам ЦБ и Open API.</li>
            </ul>
          </div>

          <div className="auth-card">
            <div className="auth-card-header">
              <span className="badge badge-muted">{userTypeLabels[userType].badge}</span>
              <h2>{userType === 'business' ? 'Управляйте кэшфлоу компании' : 'Контролируйте личные финансы'}</h2>
              <p>{userTypeLabels[userType].description}</p>
            </div>

            <div className="user-type-toggle" role="tablist" aria-label="Тип пользователя">
              <button
                type="button"
                role="tab"
                aria-selected={userType === 'individual'}
                className={`toggle-option${userType === 'individual' ? ' active' : ''}`}
                onClick={() => setUserType('individual')}
              >
                <span>Физическое лицо</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={userType === 'business'}
                className={`toggle-option${userType === 'business' ? ' active' : ''}`}
                onClick={() => setUserType('business')}
              >
                <span>Предприниматель / ИП</span>
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label className="form-field" key={`${mode}-${userType}-${field.name}`}>
                  <span className="form-label">{field.label}</span>
                  <input
                    className="form-input"
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    required
                  />
                </label>
              ))}

              {mode === 'register' && (
                <label className="form-field">
                  <span className="form-label">Клиент OpenBanking</span>
                  <select className="form-input" name="bankClientId" defaultValue={BANK_CLIENT_OPTIONS[0]?.value} required>
                    {BANK_CLIENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">Выберите одного из тестовых клиентов, выданных организаторами.</span>
                </label>
              )}

              {error && <p className="form-error" role="alert">{error}</p>}

              {mode === 'login' ? (
                <div className="form-meta">
                  <label className="checkbox-field">
                    <input type="checkbox" name="remember" />
                    <span>Запомнить меня</span>
                  </label>
                  <button type="button" className="link-button">
                    Забыли пароль?
                  </button>
                </div>
              ) : (
                <p className="form-hint">
                  Отправляя форму, вы подтверждаете согласие с{' '}
                  <button type="button" className="link-button">
                    политикой обработки данных
                  </button>{' '}
                  Monetrix.
                </p>
              )}

              <button type="submit" className="btn primary-btn auth-submit" disabled={loading}>
                {loading ? 'Подождите...' : mode === 'login' ? 'Войти в Monetrix' : 'Создать аккаунт'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? (
                <>
                  Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
                </>
              ) : (
                <>
                  Уже есть аккаунт? <Link to="/login">Войдите</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AuthPage

