import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'
import { fetchProfile, fetchRecommendations, fetchSummary, fetchTransactions } from '../lib/api'
import type { RecommendationsResponse } from '../lib/api'
import { ApiError } from '../lib/api'
import { clearToken, getToken } from '../lib/authStorage'
import { formatCurrency, formatDate, formatSignedCurrency } from '../lib/format'

type AggregatedAccount = {
  id: string
  bank: string
  type: string
  balanceValue: number
  balanceText: string
}

type AggregatedBank = {
  code: string
  name: string
  totalBalance: number
  totalBalanceText: string
  accounts: AggregatedAccount[]
}

const extractBalance = (account: Record<string, unknown>) => {
  const balanceField = account.balance ?? account.amount ?? 0
  if (typeof balanceField === 'number') return balanceField
  if (typeof balanceField === 'string') {
    const parsed = parseFloat(balanceField)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof balanceField === 'object' && balanceField !== null) {
    const value = (balanceField as Record<string, unknown>).amount ?? (balanceField as Record<string, unknown>).value
    if (typeof value === 'number') return value
    if (typeof value === 'string') return parseFloat(value)
  }
  return 0
}

const getAccountName = (account: Record<string, unknown>) => {
  return (
    (account.name as string) ||
    (account.accountType as string) ||
    (account.type as string) ||
    (account.productType as string) ||
    'Счёт'
  )
}

const getAccountId = (account: Record<string, unknown>, index: number) => {
  return (
    (account.id as string) ||
    (account.accountId as string) ||
    (account.number as string) ||
    String(index)
  )
}

const aggregateBanks = (accounts: Array<Record<string, unknown>> | undefined): AggregatedBank[] => {
  if (!accounts) return []
  const groups = new Map<string, AggregatedBank>()

  accounts.forEach((account, index) => {
    const bankCode = (account.bank as string) || 'unknown'
    const bankName = (account.bankLabel as string) || (account.bankName as string) || bankCode.toUpperCase()
    const balanceValue = extractBalance(account)
    const accountData: AggregatedAccount = {
      id: getAccountId(account, index),
      bank: bankName,
      type: getAccountName(account),
      balanceValue,
      balanceText: formatCurrency(balanceValue),
    }

    if (!groups.has(bankCode)) {
      groups.set(bankCode, {
        code: bankCode,
        name: bankName,
        totalBalance: 0,
        totalBalanceText: formatCurrency(0),
        accounts: [],
      })
    }

    const entry = groups.get(bankCode)!
    entry.totalBalance += balanceValue
    entry.accounts.push(accountData)
    entry.totalBalanceText = formatCurrency(entry.totalBalance)
  })

  return Array.from(groups.values())
}

const buildMoneyFlow = (transactions: Array<Record<string, unknown>>) => {
  const buckets = new Map<string, { income: number; outcome: number }>()

  transactions.forEach((tx) => {
    const dateRaw = (tx.date as string) || (tx.transactionDate as string)
    if (!dateRaw) return
    const date = new Date(dateRaw)
    if (Number.isNaN(date.getTime())) return
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!buckets.has(key)) {
      buckets.set(key, { income: 0, outcome: 0 })
    }
    const bucket = buckets.get(key)!
    const amount = Number(tx.amount ?? tx.transactionAmount ?? 0)
    if (Number.isFinite(amount) && amount !== 0) {
      if (amount >= 0) bucket.income += amount
      else bucket.outcome += Math.abs(amount)
    }
  })

  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => (a > b ? 1 : -1)).slice(-3)
  return sortedKeys.map((key) => {
    const [year, month] = key.split('-')
    const label = new Date(Number(year), Number(month), 1).toLocaleDateString('ru-RU', { month: 'short' })
    const bucket = buckets.get(key)!
    return {
      month: label,
      income: Math.round(bucket.income),
      outcome: Math.round(bucket.outcome),
    }
  })
}

const ClientDashboardPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ fullName?: string; companyName?: string; bankClientId?: string; email?: string } | null>(null)
  const [consents, setConsents] = useState<Array<{ bank: string; bankLabel?: string; status: string; clientId: string }>>([])
  const [summary, setSummary] = useState<{ netWorth: number; assets: number; liabilities: number; cashflow: { next30days: number; trend: number }; budgets: Array<{ category: string; limit: number; actual: number; percentage?: number }>; accounts?: Array<Record<string, unknown>> } | null>(null)
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([])
  const [recommendations, setRecommendations] = useState<RecommendationsResponse>([])
  const [selectedBank, setSelectedBank] = useState<AggregatedBank | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const token = getToken()
        if (!token) {
          navigate('/login', { replace: true })
          return
        }
        const [profileData, summaryData, transactionsData, recommendationsData] = await Promise.all([
          fetchProfile(token),
          fetchSummary(token),
          fetchTransactions(token),
          fetchRecommendations(token),
        ])

        setProfile(profileData.user)
        setConsents(profileData.consents)
        setSummary(summaryData)
        setTransactions(transactionsData.items)
        setRecommendations(recommendationsData)
      } catch (apiError) {
        if (apiError instanceof ApiError && apiError.status === 401) {
          clearToken()
          setError('Сессия истекла. Пожалуйста, войдите заново.')
        } else if (apiError instanceof Error) {
          setError(apiError.message)
        } else {
          setError('Не удалось загрузить данные. Попробуйте позже.')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  const banks = useMemo(() => aggregateBanks(summary?.accounts), [summary])
  const moneyFlow = useMemo(() => buildMoneyFlow(transactions), [transactions])

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    navigate(0)
  }

  const handleForceLogout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar />
        <main className="client-main">
          <div className="loading-state">Загрузка данных...</div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell">
        <Topbar />
        <main className="client-main">
          <div className="error-state">
            <p>{error}</p>
            <button type="button" className="btn primary-btn" onClick={handleRetry}>
              Повторить запрос
            </button>
            <button type="button" className="btn ghost-btn" onClick={handleForceLogout}>
              Выйти
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const displayName = profile?.fullName || profile?.companyName || 'Пользователь'

  const budgets = summary?.budgets ?? []
  const goals = budgets.slice(0, 3).map((budget, index) => ({
    id: `goal-${budget.category}-${index}`,
    title: budget.category,
    target: formatCurrency(budget.limit),
    progress: budget.limit ? budget.actual / budget.limit : 0,
  }))

  const activities = consents.map((consent, index) => ({
    id: `cn-${consent.bank}-${index}`,
    time: consent.clientId,
    text: `${consent.bankLabel || consent.bank.toUpperCase()}: статус — ${consent.status}`,
  }))

  const formattedTransactions = transactions.slice(0, 50).map((tx, index) => {
    const amount = Number(tx.amount ?? tx.transactionAmount ?? 0)
    const bankLabel = (tx.bankLabel as string) || (tx.bank as string) || 'Банк'
    const accountName = getAccountName(tx)
    return {
      id: `tx-${index}`,
      date: formatDate((tx.date as string) || (tx.transactionDate as string) || ''),
      bank: bankLabel,
      account: accountName,
      type: amount >= 0 ? 'Пополнение' : 'Списание',
      amount,
      description: (tx.description as string) || (tx.reference as string) || '—',
    }
  })

  return (
    <div className="app-shell">
      <Topbar onLogout={handleForceLogout} />
      <main className="client-main">
        <div className="container client-grid">
          <section className="client-sidebar">
            <article className="client-card">
              <div className="client-avatar" aria-hidden>
                <span>{displayName.charAt(0)}</span>
              </div>
              <div className="client-card-header">
                <div>
                  <h1>{displayName}</h1>
                </div>
                <span className="client-tier">ID банка: {profile?.bankClientId || '—'}</span>
              </div>
              <dl className="client-details">
                <div>
                  <dt>E-mail</dt>
                  <dd>{profile?.email || '—'}</dd>
                </div>
                <div>
                  <dt>Тип пользователя</dt>
                  <dd>{profile?.companyName ? 'Бизнес' : 'Физическое лицо'}</dd>
                </div>
              </dl>
            </article>

            <article className="score-card">
              <h2>Показатели</h2>
              <div className="score-value">{Math.round((summary?.assets || 0) / 1000)}</div>
              <p className="score-caption">Assets · Liabilities · Cashflow</p>
              <ul className="score-list">
                <li>
                  <span>Активы</span>
                  <strong>{formatCurrency(summary?.assets || 0)}</strong>
                </li>
                <li>
                  <span>Обязательства</span>
                  <strong>{formatCurrency(summary?.liabilities || 0)}</strong>
                </li>
                <li>
                  <span>Денежный поток</span>
                  <strong>{formatCurrency(summary?.cashflow.next30days || 0)}</strong>
                </li>
              </ul>
            </article>

            <article className="goals-card">
              <h2>Цели и прогресс</h2>
              <ul>
                {goals.map((goal) => (
                  <li key={goal.id}>
                    <div className="goal-row">
                      <div>
                        <span className="goal-title">{goal.title}</span>
                        <span className="goal-target">Лимит: {goal.target}</span>
                      </div>
                      <span className="goal-progress">{Math.min(100, Math.round(goal.progress * 100))}%</span>
                    </div>
                    <div className="goal-bar">
                      <span style={{ width: `${Math.min(goal.progress * 100, 100)}%` }} />
                    </div>
                  </li>
                ))}
                {goals.length === 0 && <p className="muted">Бюджеты отсутствуют</p>}
              </ul>
            </article>
          </section>

          <section className="client-content">
            <header className="client-header">
              <div>
                <h2>Добро пожаловать, {displayName.split(' ')[0]}</h2>
                <p>Согласий активных: {consents.filter((c) => c.status === 'active').length}</p>
              </div>
              <div className="client-header-metrics">
                <article>
                  <span>Чистая стоимость</span>
                  <strong>{formatCurrency(summary?.netWorth || 0)}</strong>
                  <small>Все активы минус обязательства</small>
                </article>
                <article>
                  <span>Свободный денежный поток</span>
                  <strong>{formatCurrency(summary?.cashflow.next30days || 0)}</strong>
                  <small>На ближайшие 30 дней</small>
                </article>
              </div>
            </header>

            <div className="accounts-section">
              <article className="accounts-card">
                <header>
                  <h3>Счета и продукты</h3>
                  <span>{banks.length} банка подключено</span>
                </header>
                <ul>
                  {banks.map((bank) => (
                    <li key={bank.code} className="bank-item" onClick={() => setSelectedBank(bank)}>
                      <div>
                        <span className="account-bank">{bank.name}</span>
                      </div>
                      <div className="account-stats">
                        <strong>{bank.totalBalanceText}</strong>
                      </div>
                    </li>
                  ))}
                  {banks.length === 0 && <li className="muted">Нет подключенных счетов</li>}
                </ul>
              </article>

              <article className="cashflow-card">
                <header>
                  <h3>Прогноз денежного потока</h3>
                  <span>Последние месяцы</span>
                </header>
                <div className="cashflow-chart">
                  {moneyFlow.length === 0 && <p className="muted">Недостаточно данных для прогноза</p>}
                  {moneyFlow.map((item) => (
                    <div className="cashflow-column" key={item.month}>
                      <div className="cashflow-bars">
                        <span className="cashflow-income" style={{ height: `${item.income / 2000}px` }} />
                        <span className="cashflow-outcome" style={{ height: `${item.outcome / 2000}px` }} />
                      </div>
                      <span className="cashflow-label">{item.month}</span>
                    </div>
                  ))}
                </div>
                <div className="cashflow-legend">
                  <span className="legend-income">Доходы</span>
                  <span className="legend-outcome">Расходы</span>
                </div>
              </article>
            </div>

            <div className="categories-card">
              <header>
                <h3>Категории расходов</h3>
                <span>Контроль лимитов</span>
              </header>
              <ul>
                {budgets.map((category, index) => (
                  <li key={`${category.category}-${index}`}>
                    <div>
                      <span className="category-title">{category.category}</span>
                      <span className="category-plan">План: {formatCurrency(category.limit)}</span>
                    </div>
                    <div className="category-stats">
                      <strong>{formatCurrency(category.actual)}</strong>
                      <span className={`category-trend${category.actual > category.limit ? ' warn' : ''}`}>
                        {category.actual > category.limit ? '+ превышение' : 'в пределах'}
                      </span>
                    </div>
                    <div className="category-bar">
                      <span style={{ width: `${Math.min((category.actual / category.limit) * 100, 100)}%` }} />
                    </div>
                  </li>
                ))}
                {budgets.length === 0 && <p className="muted">Нет данных по бюджетам</p>}
              </ul>
            </div>

            <div className="recommendations-section">
              <article className="recommendations-card">
                <header>
                  <h3>Рекомендации Monetrix</h3>
                  <span>AI-советник</span>
                </header>
                <ul>
                  {recommendations.map((rec) => (
                    <li key={rec.id}>
                      <div>
                        <span className="recommendation-category">{rec.type || rec.category || 'Совет'}</span>
                        <h4>{rec.title}</h4>
                        <p>{rec.message}</p>
                      </div>
                    </li>
                  ))}
                  {recommendations.length === 0 && <li className="muted">Рекомендации не найдены</li>}
                </ul>
              </article>

              <article className="activity-card">
                <header>
                  <h3>Лента событий</h3>
                  <span>Последние обновления</span>
                </header>
                <ul>
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <span className="activity-time">{activity.time}</span>
                      <p>{activity.text}</p>
                    </li>
                  ))}
                  {activities.length === 0 && <p className="muted">События отсутствуют</p>}
                </ul>
              </article>
            </div>

            <article className="transactions-card">
              <header>
                <h3>История операций</h3>
                <span>Последние транзакции</span>
              </header>
              <ul>
                {formattedTransactions.map((tx) => (
                  <li key={tx.id}>
                    <div className="transaction-info">
                      <div>
                        <span className="transaction-date">{tx.date}</span>
                        <span className="transaction-bank">{tx.bank} · {tx.account}</span>
                        <p className="transaction-description">{tx.description}</p>
                      </div>
                      <div className={`transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                        {formatSignedCurrency(tx.amount)}
                      </div>
                    </div>
                  </li>
                ))}
                {formattedTransactions.length === 0 && <p className="muted">Транзакций нет</p>}
              </ul>
            </article>
          </section>
        </div>
      </main>
      <Footer />

      {selectedBank && (
        <div className="modal-overlay" onClick={() => setSelectedBank(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-back" type="button" onClick={() => setSelectedBank(null)} aria-label="Назад">
                ←
              </button>
              <h2>Счета {selectedBank.name}</h2>
            </header>
            <ul className="modal-accounts-list">
              {selectedBank.accounts.map((account) => (
                <li key={account.id}>
                  <div>
                    <span className="account-bank">{selectedBank.name}</span>
                    <span className="account-type">{account.type}</span>
                  </div>
                  <div className="account-stats">
                    <strong>{account.balanceText}</strong>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDashboardPage
