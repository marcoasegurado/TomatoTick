import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { SessionsProvider } from './context/SessionsContext'
import { TasksProvider } from './context/TasksContext'
import { initTheme } from './utils/theme'
import './index.css'

initTheme()

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
