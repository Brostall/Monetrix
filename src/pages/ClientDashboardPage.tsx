import { useState } from 'react'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'

type BankAccount = {
  id: string
  bank: string
  type: string
  balance: string
  trend: string
}

type Bank = {
  name: string
  totalBalance: string
  accounts: BankAccount[]
}

const profile = {
  name: 'Иван Иванов',
  tier: 'Grow',
  email: 'ivan@monetrix.app',
  phone: '+7 999 123-45-67',
}

const banks: Bank[] = [
  {
    name: 'СБЕР',
    totalBalance: '1 240 500 ₽',
    accounts: [
      { id: 'acc-1', bank: 'СБЕР', type: 'Расчетный счёт', balance: '850 000 ₽', trend: '+4.6%' },
      { id: 'acc-2', bank: 'СБЕР', type: 'Зарплатная карта', balance: '390 500 ₽', trend: '+2.1%' },
    ],
  },
  {
    name: 'Т‑Банк',
    totalBalance: '820 300 ₽',
    accounts: [
      { id: 'acc-3', bank: 'Т‑Банк', type: 'Инвестиции', balance: '620 300 ₽', trend: '+12.1%' },
      { id: 'acc-4', bank: 'Т‑Банк', type: 'Накопительный счёт', balance: '200 000 ₽', trend: '+3.2%' },
    ],
  },
  {
    name: 'Альфа-Банк',
    totalBalance: '−45 800 ₽',
    accounts: [
      { id: 'acc-5', bank: 'Альфа-Банк', type: 'Кредит', balance: '−45 800 ₽', trend: '−1.8%' },
    ],
  },
]

const moneyFlow = [
  { month: 'Окт', income: 420000, outcome: 285000 },
  { month: 'Ноя', income: 448000, outcome: 301500 },
  { month: 'Дек', income: 472000, outcome: 318400 },
]

const recommendations = [
  {
    id: 'rec-1',
    title: 'Оптимизируйте расходы на сервисы',
    description: 'Предложите миграцию на годовую подписку — экономия 18 400 ₽ в год.',
    category: 'Бюджеты',
  },
  {
    id: 'rec-2',
    title: 'Инвестируйте излишки ликвидности',
    description: 'Доступен вклад под 14,2% годовых с налоговым вычетом и страхованием до 1,4 млн ₽.',
    category: 'Инвестиции',
  },
  {
    id: 'rec-3',
    title: 'Закройте кредит досрочно',
    description: 'Единовременный платёж 45 800 ₽ сэкономит 11 200 ₽ процентов за 6 месяцев.',
    category: 'Долговая нагрузка',
  },
]

const activities = [
  {
    id: 'act-1',
    time: 'Сегодня, 12:24',
    text: 'Получено новое соглашение через ГОСТ-шлюз · Т‑Банк · Срок до 30.07.2025',
  },
  {
    id: 'act-2',
    time: 'Вчера, 19:05',
    text: 'Категоризация 128 транзакций завершена · Точность 92%',
  },
  {
    id: 'act-3',
    time: '27 окт, 15:40',
    text: 'Экспорт отчёта за Q3 отправлен на электронную почту клиента',
  },
]

const goals = [
  { id: 'goal-1', title: 'Резерв на развитие', target: '900 000 ₽', progress: 0.62 },
  { id: 'goal-2', title: 'Подушка безопасности', target: '6 мес. расходов', progress: 0.8 },
  { id: 'goal-3', title: 'Погашение кредита', target: '45 800 ₽', progress: 0.3 },
]

const categories = [
  { id: 'cat-1', title: 'Операционные расходы', value: 128000, planned: 140000 },
  { id: 'cat-2', title: 'Маркетинг', value: 54000, planned: 50000 },
  { id: 'cat-3', title: 'Развитие продукта', value: 76000, planned: 80000 },
]

const transactions = [
  { id: 'tx-1', date: '28 окт, 14:23', bank: 'СБЕР', account: 'Расчетный счёт', type: 'Списание', amount: '-28 500 ₽', description: 'Оплата услуг хостинга' },
  { id: 'tx-2', date: '28 окт, 11:15', bank: 'Т‑Банк', account: 'Инвестиции', type: 'Пополнение', amount: '+15 300 ₽', description: 'Дивиденды по акциям' },
  { id: 'tx-3', date: '27 окт, 18:42', bank: 'СБЕР', account: 'Зарплатная карта', type: 'Списание', amount: '-3 200 ₽', description: 'Оплата в ресторане' },
  { id: 'tx-4', date: '27 окт, 10:00', bank: 'Альфа-Банк', account: 'Кредит', type: 'Списание', amount: '-12 000 ₽', description: 'Ежемесячный платёж' },
  { id: 'tx-5', date: '26 окт, 16:30', bank: 'Т‑Банк', account: 'Накопительный счёт', type: 'Пополнение', amount: '+50 000 ₽', description: 'Перевод с расчётного счёта' },
  { id: 'tx-6', date: '25 окт, 09:15', bank: 'СБЕР', account: 'Расчетный счёт', type: 'Пополнение', amount: '+420 000 ₽', description: 'Оплата от клиента' },
]

const ClientDashboardPage = () => {
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)

  return (
    <div className="app-shell">
      <Topbar />
      <main className="client-main">
        <div className="container client-grid">
          <section className="client-sidebar">
            <article className="client-card">
              <div className="client-avatar" aria-hidden>
                <span>И</span>
              </div>
              <div className="client-card-header">
                <div>
                  <h1>{profile.name}</h1>
                </div>
                <span className="client-tier">Тариф {profile.tier}</span>
              </div>
              <dl className="client-details">
                <div>
                  <dt>Телефон</dt>
                  <dd>{profile.phone}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{profile.email}</dd>
                </div>
              </dl>
            </article>

            <article className="score-card">
              <h2>Финансовое здоровье</h2>
              <div className="score-value">78</div>
              <p className="score-caption">Из 100 — стабильная ликвидность, рекомендуем усилить резерв на развитие.</p>
              <ul className="score-list">
                <li>
                  <span>Доля долгов</span>
                  <strong>18%</strong>
                </li>
                <li>
                  <span>Коэффициент ликвидности</span>
                  <strong>1.4</strong>
                </li>
                <li>
                  <span>Исполнение бюджета</span>
                  <strong>92%</strong>
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
                        <span className="goal-target">Цель: {goal.target}</span>
                      </div>
                      <span className="goal-progress">{Math.round(goal.progress * 100)}%</span>
                    </div>
                    <div className="goal-bar">
                      <span style={{ width: `${goal.progress * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="client-content">
            <header className="client-header">
              <div>
                <h2>Добро пожаловать, {profile.name.split(' ')[0]}</h2>
                <p>3243 транзакции синхронизированы · Последнее обновление 5 минут назад</p>
              </div>
              <div className="client-header-metrics">
                <article>
                  <span>Чистая стоимость</span>
                  <strong>2 324 000 ₽</strong>
                  <small>+18% за 3 месяца</small>
                </article>
                <article>
                  <span>Свободный денежный поток</span>
                  <strong>135 600 ₽</strong>
                  <small>На ближайшие 30 дней</small>
                </article>
              </div>
            </header>

            <div className="accounts-section">
              <article className="accounts-card">
                <header>
                  <h3>Счета и продукты</h3>
                  <span>3 банка подключено</span>
                </header>
                <ul>
                  {banks.map((bank) => (
                    <li key={bank.name} className="bank-item" onClick={() => setSelectedBank(bank)}>
                      <div>
                        <span className="account-bank">{bank.name}</span>
                      </div>
                      <div className="account-stats">
                        <strong>{bank.totalBalance}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="cashflow-card">
                <header>
                  <h3>Прогноз денежного потока</h3>
                  <span>Динамика 90 дней</span>
                </header>
                <div className="cashflow-chart">
                  {moneyFlow.map((item) => (
                    <div className="cashflow-column" key={item.month}>
                      <div className="cashflow-bars">
                        <span className="cashflow-income" style={{ height: `${item.income / 6000}px` }} />
                        <span className="cashflow-outcome" style={{ height: `${item.outcome / 6000}px` }} />
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
                {categories.map((category) => (
                  <li key={category.id}>
                    <div>
                      <span className="category-title">{category.title}</span>
                      <span className="category-plan">План: {category.planned.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="category-stats">
                      <strong>{category.value.toLocaleString('ru-RU')} ₽</strong>
                      <span className={`category-trend${category.value > category.planned ? ' warn' : ''}`}>
                        {category.value > category.planned ? '+ превышение' : 'в пределах'}
                      </span>
                    </div>
                    <div className="category-bar">
                      <span style={{ width: `${Math.min((category.value / category.planned) * 100, 100)}%` }} />
                    </div>
                  </li>
                ))}
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
                        <span className="recommendation-category">{rec.category}</span>
                        <h4>{rec.title}</h4>
                        <p>{rec.description}</p>
                      </div>
                      <button type="button" className="link-button">
                        Применить
                      </button>
                    </li>
                  ))}
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
                </ul>
              </article>
            </div>

            <article className="transactions-card">
              <header>
                <h3>История операций</h3>
                <span>Последние транзакции</span>
              </header>
              <ul>
                {transactions.map((tx) => (
                  <li key={tx.id}>
                    <div className="transaction-info">
                      <div>
                        <span className="transaction-date">{tx.date}</span>
                        <span className="transaction-bank">{tx.bank} · {tx.account}</span>
                        <p className="transaction-description">{tx.description}</p>
                      </div>
                      <div className={`transaction-amount ${tx.type === 'Списание' ? 'negative' : 'positive'}`}>
                        {tx.amount}
                      </div>
                    </div>
                  </li>
                ))}
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
                    <strong>{account.balance}</strong>
                    <span className={`account-trend${account.trend.startsWith('-') ? ' negative' : ''}`}>{account.trend}</span>
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
