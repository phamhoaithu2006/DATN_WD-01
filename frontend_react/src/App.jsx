import { LocaleProvider } from './contexts/LocaleContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <LocaleProvider>
      <AppRoutes />
    </LocaleProvider>
  )
}

export default App
