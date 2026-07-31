import apiClient from './apiClient'

let cachedFaqData = null
let pendingFaqRequest = null

function normalizeFaqItem(item) {
  const id = Number(item?.id)
  const question = typeof item?.question === 'string' ? item.question.trim() : ''
  const answer = typeof item?.answer === 'string' ? item.answer.trim() : ''

  if (!Number.isInteger(id) || id <= 0 || !question || !answer) return null

  return {
    id,
    category: typeof item?.category === 'string' ? item.category : '',
    categoryLabel:
      typeof item?.category_label === 'string' ? item.category_label : '',
    question,
    answer,
    keywords: Array.isArray(item?.keywords)
      ? item.keywords.filter((keyword) => typeof keyword === 'string')
      : [],
    sortOrder: Number(item?.sort_order) || 0,
  }
}

function normalizeFaqResponse(response) {
  const payload = response.data?.data || response.data || {}
  const items = Array.isArray(payload.items)
    ? payload.items.map(normalizeFaqItem).filter(Boolean)
    : []
  const categories = Array.isArray(payload.categories)
    ? payload.categories
        .filter(
          (category) =>
            typeof category?.key === 'string' &&
            typeof category?.label === 'string',
        )
        .map((category) => ({
          key: category.key,
          label: category.label,
        }))
    : []

  return {
    items: items.sort((first, second) =>
      first.sortOrder === second.sortOrder
        ? first.id - second.id
        : first.sortOrder - second.sortOrder,
    ),
    categories,
  }
}

export function fetchFaqs({ force = false } = {}) {
  if (force) cachedFaqData = null
  if (cachedFaqData) return Promise.resolve(cachedFaqData)
  if (pendingFaqRequest) return pendingFaqRequest

  pendingFaqRequest = apiClient
    .get('/faqs')
    .then(normalizeFaqResponse)
    .then((data) => {
      cachedFaqData = data
      return data
    })
    .finally(() => {
      pendingFaqRequest = null
    })

  return pendingFaqRequest
}

export function normalizeFaqSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function filterFaqs(items, category, search) {
  const normalizedSearch = normalizeFaqSearchText(search)

  return items.filter((faq) => {
    if (category && faq.category !== category) return false
    if (!normalizedSearch) return true

    return normalizeFaqSearchText(
      [faq.question, faq.answer, ...faq.keywords].join(' '),
    ).includes(normalizedSearch)
  })
}
