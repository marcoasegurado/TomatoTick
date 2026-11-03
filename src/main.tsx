import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { TasksProvider } from './context/TasksContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <TasksProvider>
        <App />
      </TasksProvider>
    </SettingsProvider>
  </StrictMode>,
)
