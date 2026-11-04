import { Target } from 'lucide-react'
import { useTasks } from '../context/TasksContext'

function CurrentTask() {
  const { activeTask } = useTasks()

  return (
    <div className="current-task" aria-live="polite">
      <Target className="current-task__icon" size={17} aria-hidden="true" />
      {activeTask ? (
        <span className="current-task__text">
          Focusing on <strong>{activeTask.title}</strong>
        </span>
      ) : (
        <span className="current-task__text current-task__text--empty">
          No task selected
        </span>
      )}
    </div>
  )
}

export default CurrentTask
