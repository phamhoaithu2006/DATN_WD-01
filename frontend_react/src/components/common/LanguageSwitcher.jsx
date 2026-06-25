import { useLocale } from '../../contexts/LocaleContext'

const flags = {
  vi: (
    <svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
      <rect width="30" height="20" fill="#da251d"/>
      <polygon points="15,4 16.18,7.63 20,7.63 16.91,9.88 18.09,13.51 15,11.25 11.91,13.51 13.09,9.88 10,7.63 13.82,7.63" fill="#ffff00"/>
    </svg>
  ),
  en: (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0 0L60 30M60 0L0 30" stroke="#FFFFFF" strokeWidth="6"/>
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M0 15H60M30 0V30" stroke="#FFFFFF" strokeWidth="10"/>
      <path d="M0 15H60M30 0V30" stroke="#C8102E" strokeWidth="6"/>
    </svg>
  )
}

const languages = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

function LanguageSwitcher({ className }) {
  const { language, changeLanguage } = useLocale()
  const current = languages.find((lang) => lang.code === language) || languages[0]

  return (
    <div className={`language-switcher ${className || ''}`}>
      <button className="language-current" type="button" aria-label="Chọn ngôn ngữ">
        <span className="language-flag" aria-hidden="true">
          {flags[current.code]}
        </span>
        <span className="language-current-label">
          {current.label}
        </span>
        <span className="language-arrow" aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <div className="language-dropdown-panel">
        <div className="language-dropdown-title">Ngôn ngữ</div>
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button
              className={language === lang.code ? 'active' : ''}
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
            >
              <span className="language-option-flag" aria-hidden="true">
                {flags[lang.code]}
              </span>
              <span className="language-option-label">
                {lang.label}
              </span>
              {language === lang.code ? (
                <span className="language-check">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L4 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguageSwitcher
