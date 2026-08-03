import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './i18n/i18n'
import './index.css'
import App from './App.jsx'
import AppConfirmDialog from './components/common/AppConfirmDialog.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster richColors position="top-right" duration={5000} closeButton />
      <App />
      <AppConfirmDialog />
    </BrowserRouter>
  </StrictMode>,
)
