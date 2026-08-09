export function formatVndCurrency(value, fallback = '') {
  const amount = Number(value)

  if (!Number.isFinite(amount)) return fallback || String(value ?? '')

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)} VNĐ`
}

export function normalizeCurrency(currency) {
  return String(currency || '').toUpperCase() === 'USD' ? 'USD' : 'VND'
}
