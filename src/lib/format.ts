const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value || 0))
  return currencyFormatter.format(Number.isFinite(num) ? num : 0)
}

export function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${currencyFormatter.format(Math.abs(value))}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}
