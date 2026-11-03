import { useCallback, useState } from 'react'
import Header from './components/Header'
import SettingsModal from './components/SettingsModal'
import Sidebar from './components/Sidebar'
import TimerArea from './components/TimerArea'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const openTasks = useCallback(() => setTasksOpen(true), [])
  const closeTasks = useCallback(() => setTasksOpen(false), [])

  return (
    <div className="app">
      <Header onOpenSettings={openSettings} onOpenTasks={openTasks} />
      <div className="app__body">
        <main className="app__main">
          <TimerArea />
        </main>
        <Sidebar open={tasksOpen} onClose={closeTasks} />
      </div>
      {settingsOpen && <SettingsModal onClose={closeSettings} />}
    </div>
  )
}

export default App
