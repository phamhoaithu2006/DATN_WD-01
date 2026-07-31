import { useEffect, useId, useMemo, useState } from 'react'
import { fetchFaqs, filterFaqs } from '../../../services/faqApi'
import '../../../styles/faq.css'
import Icon from '../Icon'

function FaqLoadingState() {
  return (
    <div className="vg-faq-loading" aria-label="Đang tải câu hỏi thường gặp">
      {[0, 1, 2, 3, 4].map((item) => (
        <span key={item} />
      ))}
    </div>
  )
}

function FaqBrowser({ compact = false, onBack = null }) {
  const componentId = useId().replace(/:/g, '')
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [openFaqId, setOpenFaqId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    fetchFaqs({ force: requestVersion > 0 })
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setCategories(data.categories)
      })
      .catch(() => {
        if (active) {
          setError('Không thể tải câu hỏi thường gặp. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestVersion])

  const filteredItems = useMemo(
    () => filterFaqs(items, selectedCategory, search),
    [items, search, selectedCategory],
  )

  function selectCategory(category) {
    setSelectedCategory(category)
    setOpenFaqId(null)
  }

  function updateSearch(event) {
    setSearch(event.target.value)
    setOpenFaqId(null)
  }

  return (
    <section className={`vg-faq-browser${compact ? ' is-compact' : ''}`}>
      {onBack ? (
        <header className="vg-faq-compact-header">
          <button type="button" onClick={onBack} aria-label="Quay lại trò chuyện">
            <span aria-hidden="true">←</span>
            Quay lại trò chuyện
          </button>
          <strong>Câu hỏi thường gặp</strong>
        </header>
      ) : null}

      <div className="vg-faq-tools">
        <label className="vg-faq-search">
          <Icon name="search" size={19} />
          <span className="sr-only">Tìm kiếm câu hỏi thường gặp</span>
          <input
            type="search"
            value={search}
            onChange={updateSearch}
            placeholder="Tìm câu hỏi, ví dụ: hoàn tiền..."
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setOpenFaqId(null)
              }}
              aria-label="Xóa nội dung tìm kiếm"
            >
              <Icon name="close" size={15} />
            </button>
          ) : null}
        </label>

        <div className="vg-faq-categories" aria-label="Danh mục FAQ">
          <button
            type="button"
            className={selectedCategory === '' ? 'is-active' : ''}
            onClick={() => selectCategory('')}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.key}
              className={selectedCategory === category.key ? 'is-active' : ''}
              onClick={() => selectCategory(category.key)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <FaqLoadingState /> : null}

      {!loading && error ? (
        <div className="vg-faq-state is-error" role="alert">
          <Icon name="alertCircle" size={30} />
          <strong>Không tải được dữ liệu FAQ</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      ) : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <div className="vg-faq-state" role="status">
          <Icon name="search" size={30} />
          <strong>Không tìm thấy câu hỏi phù hợp</strong>
          <p>Hãy thử từ khóa khác hoặc chọn lại danh mục.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setSelectedCategory('')
              setOpenFaqId(null)
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <div className="vg-faq-results">
          <p className="vg-faq-result-count" role="status">
            {filteredItems.length} câu hỏi phù hợp
          </p>
          <div className="vg-faq-accordion">
            {filteredItems.map((faq) => {
              const isOpen = openFaqId === faq.id
              const answerId = `faq-answer-${componentId}-${faq.id}`

              return (
                <article className={`vg-faq-item${isOpen ? ' is-open' : ''}`} key={faq.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  >
                    <span>
                      <small>{faq.categoryLabel}</small>
                      <strong>{faq.question}</strong>
                    </span>
                    <Icon name="chevronDown" size={18} />
                  </button>
                  {isOpen ? (
                    <div className="vg-faq-answer" id={answerId}>
                      <p>{faq.answer}</p>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default FaqBrowser
