import Header from './components/Header'
import TimerArea from './components/TimerArea'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <div className="app" data-mode="focus">
      <Header />
      <div className="app__body">
        <main className="app__main">
          <TimerArea />
        </main>
        <Sidebar />
      </div>
    </div>
  )
}

export default App
