const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

type RequestOptions = {
  method?: string
  token?: string
  body?: unknown
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = options
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.detail || data?.error || response.statusText
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Record<string, unknown>
}

export function registerIndividual(payload: { fullName: string; email: string; password: string; bankClientId?: string }) {
  return request<AuthResponse | { error: string }>('/api/auth/register', {
    method: 'POST',
    body: {
      userType: 'individual',
      ...payload,
    },
  }).then((data) => {
    if ('error' in data) throw new Error(data.error)
    return data
  })
}

export function registerBusiness(payload: { companyName: string; inn: string; contact: string; email: string; password: string; bankClientId?: string }) {
  return request<AuthResponse | { error: string }>('/api/auth/register', {
    method: 'POST',
    body: {
      userType: 'business',
      ...payload,
    },
  }).then((data) => {
    if ('error' in data) throw new Error(data.error)
    return data
  })
}

export function login(payload: { userType: 'individual' | 'business'; email: string; password: string }) {
  return request<AuthResponse | { error: string }>('/api/auth/login', {
    method: 'POST',
    body: payload,
  }).then((data) => {
    if ('error' in data) throw new Error(data.error)
    return data
  })
}

export type ProfileResponse = {
  user: {
    id: string
    userType: string
    fullName?: string
    companyName?: string
    bankClientId?: string
    email?: string
  }
  consents: Array<{ bank: string; bankLabel?: string; status: string; clientId: string; consentId?: string }>
  availableClients?: string[]
}

export function fetchProfile(token: string) {
  return request<ProfileResponse>('/api/profile', { token })
}

export type SummaryResponse = {
  netWorth: number
  assets: number
  liabilities: number
  cashflow: { next30days: number; trend: number }
  budgets: Array<{ category: string; limit: number; actual: number; percentage?: number }>
  consents?: Array<{ bank: string; status: string }>
  accounts?: Array<Record<string, unknown>>
  transactions?: Array<Record<string, unknown>>
}

export function fetchSummary(token: string) {
  return request<SummaryResponse>('/api/dashboard/summary', { token })
}

export type TransactionsResponse = {
  items: Array<Record<string, unknown>>
  pagination: { limit: number; offset: number; total: number }
}

export function fetchTransactions(token: string) {
  return request<TransactionsResponse>('/api/dashboard/transactions', { token })
}

export type RecommendationsResponse = Array<{ id: string; type?: string; title: string; message: string; severity?: string; category?: string }>

export function fetchRecommendations(token: string) {
  return request<RecommendationsResponse>('/api/recommendations', { token })
}
