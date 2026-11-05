import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { SessionsProvider } from './context/SessionsContext'
import { TasksProvider } from './context/TasksContext'
import { registerServiceWorker } from './utils/pwa'
import { initTheme, watchSystemTheme } from './utils/theme'
import './index.css'

initTheme()
watchSystemTheme()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <TasksProvider>
        <SessionsProvider>
          <App />
        </SessionsProvider>
      </TasksProvider>
    </SettingsProvider>
  </StrictMode>,
)
