import { useTasks } from '../context/TasksContext'

function CurrentTask() {
  const { activeTask } = useTasks()

  return (
    <div className="current-task" aria-live="polite">
      <span className="current-task__icon" aria-hidden="true">
        🎯
      </span>
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
