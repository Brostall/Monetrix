import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'

const features = [
  {
    title: 'Единый дашборд по всем финансовым продуктам',
    description:
      'Подключите банковские счета, карты, инвестиции и кредиты — Monetrix приведёт их к единому формату и покажет чистый остаток, обязательства и динамику.',
  },
  {
    title: 'AI-советник по целям и инвестициям',
    description:
      'Получайте персональные рекомендации по управлению ликвидностью, инвестированию и снижению долговой нагрузки на основе транзакционной истории.',
  },
  {
    title: 'Прогнозирование cashflow и сценарное планирование',
    description:
      'Оценивайте движение денег по неделям и месяцам, моделируйте крупные покупки и сразу видьте влияние на цели и долговую нагрузку.',
  },
  {
    title: 'Бюджеты, уведомления и контроль лимитов',
    description:
      'Настраивайте гибкие бюджеты, push-уведомления и автоматизированные триггеры — сервис предупредит о перерасходе и порекомендует корректировки.',
  },
]

const workflowSteps = [
  {
    title: 'Подключение через OAuth 2.0 / ГОСТ-шлюз',
    description:
      'Клиент авторизуется в банке, выдаёт доступ через открытый API. Мы бережно храним refresh-токены в зашифрованном виде и регулярно их обновляем.',
  },
  {
    title: 'Нормализация и категоризация данных',
    description:
      'Транзакции приводятся к единой схеме, автоматически классифицируются ML-моделью и обогащаются справочниками MCC, контрагентами и геометками.',
  },
  {
    title: 'Персонализация и монетизация',
    description:
      'Формируем персональные рекомендации, триггерные кампании и подбор партнёрских продуктов. Доход идёт с подписки, офферов и white-label лицензий.',
  },
]

const pricingPlans = [
  {
    name: 'Start',
    price: '0 ₽ / мес',
    description: 'Фремиум-доступ для физических лиц и самозанятых.',
    features: [
      'Подключение до 2 банков и 5 продуктов',
      'Категоризация транзакций в реальном времени',
      'Единый отчёт по остаткам и обязательствам',
    ],
  },
  {
    name: 'Grow',
    price: '790 ₽ / мес',
    description: 'Премиум-доступ с расширенной аналитикой и поддержкой ИП.',
    features: [
      'Неограниченное число банков через ГОСТ-шлюз',
      'Сценарное планирование и прогноз cashflow',
      'AI-советник и персональные рекомендации',
      'Экспорт в PDF и Мой Офис, интеграция с 1С',
    ],
    highlight: true,
  },
  {
    name: 'Partner',
    price: 'по запросу',
    description: 'White-label платформа для финтеха и банковских экосистем.',
    features: [
      'SDK и API для интеграции в существующий продукт',
      'Совместные партнёрские офферы и revenue sharing',
      'SLA 99.9%, выделенный менеджер, кастомные отчёты',
    ],
  },
]

const securityHighlights = [
  {
    title: 'Соответствие стандартам ЦБ и Open API',
    description:
      'Архитектура следует требованиям Стандарта Банка России по открытым API и ГОСТ Р 57580. Применяем ротацию ключей и аудит доступа.',
  },
  {
    title: 'Шифрование и управление токенами',
    description:
      'Refresh-токены шифруются с использованием аппаратных модулей (HSM) и никогда не хранятся в открытом виде. Данные покидают банк только по согласованию пользователя.',
  },
  {
    title: 'Наблюдаемость и антифрод',
    description:
      'Потоки событий проходят через систему мониторинга, аномалии и лимиты KPIs отслеживаются в реальном времени. Инциденты закрываем по процедурам ИБ.',
  },
]

const metrics = [
  {
    value: '3 минуты',
    title: 'среднее время подключения всех банков клиента через мастера OAuth 2.0',
  },
  {
    value: '92%',
    title: 'транзакций автоматически категоризируется благодаря ML-модели Monetrix',
  },
  {
    value: '4 источника дохода',
    title: 'подписка, премиальные аналитические пакеты, партнёрские офферы и white-label',
  },
]

const banks = [
  'СБЕР',
  'Т‑Банк',
  'ВТБ',
  'Альфа-Банк',
  'Газпромбанк',
  'Райффайзен',
  'Россельхозбанк',
  'ПСБ',
  'МТС Банк',
  'ЮMoney',
  'Банк Открытие',
  'Ак Барс',
]

const LandingPage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    if (scrollTo) {
      const el = document.getElementById(scrollTo)
      if (el) {
        window.requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  return (
    <div className="app-shell">
      <Topbar />

      <main className="main">
        <section className="hero container" id="hero">
          <div className="hero-copy">
            <span className="badge">Мультибанковское управление финансами</span>
            <h1>Monetrix — единое финансовое пространство для ваших клиентов</h1>
            <p>
              Агрегируйте счета, карты, инвестиции и кредиты в одном интерфейсе. Monetrix подключается к открытым банковским API, помогает строить прогнозы,
              даёт персональные рекомендации и открывает новые источники монетизации.
            </p>
            <div className="hero-actions">
              <Link className="btn primary-btn" to="/client">
                Открыть демо-кабинет
              </Link>
              <button className="btn ghost-btn" type="button">
                Скачать презентацию
              </button>
              <Link className="btn ghost-btn" to="/login">
                Авторизация
              </Link>
            </div>
            <div className="trust-grid">
              <div className="trust-card">
                <span className="trust-label">ГОСТ-шлюз</span>
                <p className="trust-text">Готовы к подключению банков через ГОСТ API и песочницы ЦБ РФ.</p>
              </div>
              <div className="trust-card">
                <span className="trust-label">OAuth 2.0 / OIDC</span>
                <p className="trust-text">Безопасная авторизация, шифрование токенов и журналирование событий.</p>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden>
            <div className="visual-card connections-card">
              <div className="visual-header">
                <span>Подключения</span>
                <span className="status-pill status-positive">Live</span>
              </div>
              <ul className="connections-list">
                <li>
                  <span className="bank-name">СБЕР · Зарплатная карта</span>
                  <span className="bank-amount">+1 240 500 ₽</span>
                </li>
                <li>
                  <span className="bank-name">Т‑Банк · Инвестиции</span>
                  <span className="bank-amount">+820 300 ₽</span>
                </li>
                <li>
                  <span className="bank-name">Альфа-Банк · Кредит</span>
                  <span className="bank-amount">−45 800 ₽</span>
                </li>
              </ul>
            </div>
            <div className="visual-card forecast-card">
              <div className="forecast-value">+18%</div>
              <p className="forecast-caption">Прогноз роста капитала за 3 месяца</p>
              <div className="forecast-bar">
                <span style={{ width: '72%' }} />
              </div>
              <dl className="forecast-stats">
                <div>
                  <dt>Доходы</dt>
                  <dd>+420 000 ₽</dd>
                </div>
                <div>
                  <dt>Расходы</dt>
                  <dd>−285 000 ₽</dd>
                </div>
              </dl>
            </div>
            <div className="visual-card alerts-card">
              <h4>Сигналы Monetrix</h4>
              <ul className="alerts-list">
                <li>Лимит на раздел «Развлечения» превышен на 8% — предложить корректировку бюджета.</li>
                <li>Доступен вклад под 14,2% годовых с налоговым вычетом — персональная рекомендация.</li>
                <li>Погашение кредита в Альфа-Банке через 5 дней — напоминание отправлено.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="metrics container">
          <div className="metrics-grid">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.title}>
                <span className="metric-value">{metric.value}</span>
                <p className="metric-title">{metric.title}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="features container" id="features">
          <div className="section-heading">
            <h2 className="section-title">Возможности Monetrix</h2>
            <p className="section-subtitle">Создаём полный цифровой профиль клиента, чтобы помогать принимать финансовые решения и зарабатывать на партнёрских сервисах.</p>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-accent" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow container" id="workflow">
          <div className="section-heading">
            <h2 className="section-title">Как работает платформа</h2>
            <p className="section-subtitle">От авторизации клиента до персональных рекомендаций и монетизации — весь путь прозрачен и масштабируется на новые банки.</p>
          </div>
          <div className="workflow-grid">
            {workflowSteps.map((step, index) => (
              <article className="step-card" key={step.title}>
                <span className="step-index">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="banks container" id="banks">
          <div className="section-heading">
            <h2 className="section-title">Банки и финсервисы в дорожной карте</h2>
            <p className="section-subtitle">Поддерживаем подключение к песочницам и боевым API. Архитектура позволяет добавлять новые интеграции за считанные дни.</p>
          </div>
          <div className="banks-cloud">
            {banks.map((bank) => (
              <span className="bank-pill" key={bank}>
                {bank}
              </span>
            ))}
          </div>
        </section>

        <section className="pricing container" id="pricing">
          <div className="section-heading">
            <h2 className="section-title">Монетизация и тарифы</h2>
            <p className="section-subtitle">Гибкая модель: freemium для привлечения, премиум-подписка для монетизации, white-label для партнёров и банков.</p>
          </div>
          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <article className={`plan-card${plan.highlight ? ' highlight' : ''}`} key={plan.name}>
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <span className="plan-price">{plan.price}</span>
                  <p className="plan-description">{plan.description}</p>
                </div>
                <ul className="plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="btn secondary-btn" to="/register">
                  Подключить
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="security container" id="security">
          <div className="section-heading">
            <h2 className="section-title">Безопасность и надёжность</h2>
            <p className="section-subtitle">Строим продукт, соответствующий требованиям Банка России и ожиданиям пользователей по защите данных.</p>
          </div>
          <div className="security-grid">
            {securityHighlights.map((item) => (
              <article className="security-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage

