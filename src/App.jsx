import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const createNode = (title = '新規タスク') => {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    title,
    children: [],
  }
}

const findLargeById = (nodes, largeId) =>
  nodes.find((node) => node.id === largeId) ?? null

const findMiddleById = (nodes, largeId, middleId) => {
  const large = findLargeById(nodes, largeId)
  if (!large) {
    return null
  }
  return large.children.find((child) => child.id === middleId) ?? null
}

const addLarge = (nodes, title = '新規大階層', presetNode = null) => [
  ...nodes,
  presetNode ?? createNode(title),
]

const addMiddle = (nodes, largeId, title = '新規中階層') =>
  nodes.map((node) => {
    if (node.id !== largeId) {
      return node
    }
    return {
      ...node,
      children: [...node.children, createNode(title)],
    }
  })

const addSmall = (nodes, largeId, middleId, title = '新規小階層') =>
  nodes.map((node) => {
    if (node.id !== largeId) {
      return node
    }

    return {
      ...node,
      children: node.children.map((middle) => {
        if (middle.id !== middleId) {
          return middle
        }
        return {
          ...middle,
          children: [...middle.children, createNode(title)],
        }
      }),
    }
  })

const updateTitleInTree = (nodes, id, title) =>
  nodes.map((node) => {
    if (node.id === id) {
      return { ...node, title }
    }
    return { ...node, children: updateTitleInTree(node.children, id, title) }
  })

const SelectionModal = ({
  title,
  description,
  options,
  value,
  onChange,
  onCancel,
  onConfirm,
  confirmLabel,
}) => (
  <div className="modal-backdrop" role="presentation">
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn primary" onClick={onConfirm} disabled={!value}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
)

const LargeMiddleScreen = ({
  nodes,
  selectedLargeId,
  setSelectedLargeId,
  onAddLarge,
  onAddMiddle,
  onUpdateTitle,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAddMiddleModal, setShowAddMiddleModal] = useState(false)
  const [targetLargeId, setTargetLargeId] = useState('')
  const selectedLarge = findLargeById(nodes, selectedLargeId)

  useEffect(() => {
    const fromState = location.state?.selectedLargeId
    if (fromState && fromState !== selectedLargeId) {
      setSelectedLargeId(fromState)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate, selectedLargeId, setSelectedLargeId])

  useEffect(() => {
    if (nodes.length === 0) {
      if (selectedLargeId) {
        setSelectedLargeId('')
      }
      return
    }

    if (!selectedLarge) {
      setSelectedLargeId(nodes[0].id)
    }
  }, [nodes, selectedLarge, selectedLargeId, setSelectedLargeId])

  const openAddMiddleModal = () => {
    if (nodes.length === 0) {
      return
    }
    setTargetLargeId(selectedLarge?.id ?? nodes[0].id)
    setShowAddMiddleModal(true)
  }

  const handleConfirmAddMiddle = () => {
    if (!targetLargeId) {
      return
    }
    onAddMiddle(targetLargeId)
    setSelectedLargeId(targetLargeId)
    setShowAddMiddleModal(false)
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>大階層 / 中階層</h1>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={onAddLarge}>
            大階層タスク追加
          </button>
          <button className="btn" onClick={openAddMiddleModal} disabled={nodes.length === 0}>
            中階層タスク追加
          </button>
          <button className="btn ghost" onClick={() => navigate('/tasks')}>
            タスク一覧
          </button>
        </div>
      </header>

      {nodes.length === 0 ? (
        <section className="empty-state">
          <h2>まず大階層を追加</h2>
          <p>右上の「大階層タスク追加」から開始できます。</p>
        </section>
      ) : (
        <section className="board two-column">
          <div className="panel">
            <h2>大階層</h2>
            <div className="list">
              {nodes.map((large) => (
                <div
                  key={large.id}
                  className={`list-item selectable ${selectedLarge?.id === large.id ? 'active' : ''}`}
                  onClick={() => setSelectedLargeId(large.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedLargeId(large.id)
                    }
                  }}
                >
                  <input
                    value={large.title}
                    onChange={(event) => onUpdateTitle(large.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => setSelectedLargeId(large.id)}
                    placeholder="大階層名"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>中階層</h2>
            {!selectedLarge || selectedLarge.children.length === 0 ? (
              <p className="panel-empty">中階層がありません。右上から追加してください。</p>
            ) : (
              <div className="list">
                {selectedLarge.children.map((middle) => (
                  <div
                    key={middle.id}
                    className="list-item middle-card"
                    onClick={() => navigate(`/middle/${selectedLarge.id}/${middle.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        navigate(`/middle/${selectedLarge.id}/${middle.id}`)
                      }
                    }}
                  >
                    <input
                      value={middle.title}
                      onChange={(event) => onUpdateTitle(middle.id, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="中階層名"
                    />
                    <span className="link-hint">クリックで中小画面へ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {showAddMiddleModal && (
        <SelectionModal
          title="中階層の追加先を選択"
          description="どの大階層に中階層を追加するかを選んでください。"
          options={nodes.map((node) => ({ id: node.id, label: node.title || '名称未設定' }))}
          value={targetLargeId}
          onChange={setTargetLargeId}
          onCancel={() => setShowAddMiddleModal(false)}
          onConfirm={handleConfirmAddMiddle}
          confirmLabel="追加"
        />
      )}
    </div>
  )
}

const MiddleSmallScreen = ({ nodes, onAddMiddle, onAddSmall, onUpdateTitle }) => {
  const navigate = useNavigate()
  const { largeId, middleId } = useParams()
  const [showAddSmallModal, setShowAddSmallModal] = useState(false)
  const [targetMiddleId, setTargetMiddleId] = useState('')
  const large = findLargeById(nodes, largeId)
  const middle = findMiddleById(nodes, largeId, middleId)
  const middleOptions = useMemo(() => large?.children ?? [], [large])

  useEffect(() => {
    if (!large) {
      navigate('/', { replace: true })
      return
    }

    if (!middle) {
      const firstMiddle = large.children[0]
      if (!firstMiddle) {
        navigate('/', { replace: true, state: { selectedLargeId: large.id } })
        return
      }
      navigate(`/middle/${large.id}/${firstMiddle.id}`, { replace: true })
    }
  }, [large, middle, navigate])

  if (!large || !middle) {
    return null
  }

  const handleAddMiddle = () => {
    onAddMiddle(large.id)
  }

  const openAddSmallModal = () => {
    setTargetMiddleId(middle.id)
    setShowAddSmallModal(true)
  }

  const handleConfirmAddSmall = () => {
    if (!targetMiddleId) {
      return
    }
    onAddSmall(large.id, targetMiddleId)
    navigate(`/middle/${large.id}/${targetMiddleId}`)
    setShowAddSmallModal(false)
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>中階層 / 小階層</h1>
          <p className="subtitle">
            {large.title || '大階層未設定'} / {middle.title || '中階層未設定'}
          </p>
        </div>
        <div className="toolbar">
          <button
            className="btn ghost"
            onClick={() => navigate('/', { state: { selectedLargeId: large.id } })}
          >
            大階層へ遷移
          </button>
          <button className="btn" onClick={handleAddMiddle}>
            中階層タスク追加
          </button>
          <button className="btn primary" onClick={openAddSmallModal}>
            小階層タスク追加
          </button>
          <button className="btn ghost" onClick={() => navigate('/tasks')}>
            タスク一覧
          </button>
        </div>
      </header>

      <section className="board two-column">
        <div className="panel">
          <h2>中階層（同じ大階層配下）</h2>
          <div className="list">
            {middleOptions.map((item) => (
              <div
                key={item.id}
                className={`list-item selectable ${item.id === middle.id ? 'active' : ''}`}
                onClick={() => navigate(`/middle/${large.id}/${item.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/middle/${large.id}/${item.id}`)
                  }
                }}
              >
                <input
                  value={item.title}
                  onChange={(event) => onUpdateTitle(item.id, event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  placeholder="中階層名"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>小階層</h2>
          {middle.children.length === 0 ? (
            <p className="panel-empty">小階層がありません。右上から追加してください。</p>
          ) : (
            <div className="list">
              {middle.children.map((small) => (
                <div key={small.id} className="list-item">
                  <input
                    value={small.title}
                    onChange={(event) => onUpdateTitle(small.id, event.target.value)}
                    placeholder="小階層名"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showAddSmallModal && (
        <SelectionModal
          title="小階層の追加先を選択"
          description="どの中階層に小階層を追加するかを選んでください。"
          options={middleOptions.map((item) => ({
            id: item.id,
            label: item.title || '名称未設定',
          }))}
          value={targetMiddleId}
          onChange={setTargetMiddleId}
          onCancel={() => setShowAddSmallModal(false)}
          onConfirm={handleConfirmAddSmall}
          confirmLabel="追加"
        />
      )}
    </div>
  )
}

const TaskDetailModal = ({ task, onClose }) => {
  const navigate = useNavigate()
  const [targetMinutes, setTargetMinutes] = useState('')

  const handleStart = () => {
    navigate('/execute', {
      state: { taskTitle: task.title || '名称未設定', targetMinutes },
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal task-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="タスク詳細"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{task.title || '名称未設定'}</h2>
        <label className="target-time-label">
          目標時間（分）
          <input
            type="number"
            min="1"
            className="target-time-input"
            value={targetMinutes}
            onChange={(event) => setTargetMinutes(event.target.value)}
            placeholder="例: 25"
          />
        </label>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            閉じる
          </button>
          <button className="btn primary" disabled={!targetMinutes} onClick={handleStart}>
            スタート
          </button>
        </div>
      </div>
    </div>
  )
}

const TaskListScreen = ({ nodes }) => {
  const navigate = useNavigate()
  const [selectedTask, setSelectedTask] = useState(null)

  const rows = useMemo(() => {
    const result = []
    for (const large of nodes) {
      if (large.children.length === 0) {
        result.push({ large, middle: null, small: null })
      } else {
        for (const middle of large.children) {
          if (middle.children.length === 0) {
            result.push({ large, middle, small: null })
          } else {
            for (const small of middle.children) {
              result.push({ large, middle, small })
            }
          }
        }
      }
    }
    return result
  }, [nodes])

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>タスク一覧</h1>
        </div>
        <div className="toolbar">
          <button className="btn ghost" onClick={() => navigate('/')}>
            大階層へ戻る
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="empty-state">
          <h2>タスクがありません</h2>
          <p>まず大階層画面からタスクを追加してください。</p>
        </section>
      ) : (
        <section className="board">
          <div className="task-table">
            <div className="task-table-header">
              <div className="task-table-cell">大階層</div>
              <div className="task-table-cell">中階層</div>
              <div className="task-table-cell">小階層</div>
            </div>
            {rows.map((row, index) => (
              <div
                key={index}
                className="task-table-row"
                onClick={() => {
                  const task = row.small ?? row.middle ?? row.large
                  setSelectedTask(task)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    const task = row.small ?? row.middle ?? row.large
                    setSelectedTask(task)
                  }
                }}
              >
                <div className="task-table-cell">{row.large.title || '名称未設定'}</div>
                <div className="task-table-cell">{row.middle?.title || '—'}</div>
                <div className="task-table-cell">{row.small?.title || '—'}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

const TaskExecutionScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { taskTitle, targetMinutes } = location.state ?? {}

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef(null)

  const startInterval = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
  }, [])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!taskTitle) {
      navigate('/tasks', { replace: true })
      return
    }
    startInterval()
    return () => stopInterval()
  }, [taskTitle, navigate, startInterval, stopInterval])

  useEffect(() => {
    if (isRunning) {
      startInterval()
    } else {
      stopInterval()
    }
  }, [isRunning, startInterval, stopInterval])

  const handleBreak = () => {
    setIsRunning((prev) => !prev)
  }

  const handleComplete = () => {
    stopInterval()
    setIsRunning(false)
    setTotalSeconds((prev) => prev + elapsedSeconds)
    setElapsedSeconds(0)
  }

  if (!taskTitle) return null

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>タスク実行</h1>
        </div>
        <div className="toolbar">
          <button className="btn ghost" onClick={() => navigate('/tasks')}>
            一覧に戻る
          </button>
        </div>
      </header>

      <section className="board execution-board">
        <div className="execution-task-name">{taskTitle}</div>
        <div className="execution-info-row">
          <div className="execution-info-card">
            <span className="execution-info-label">目標時間</span>
            <span className="execution-info-value">{targetMinutes} 分</span>
          </div>
          <div className="execution-info-card">
            <span className="execution-info-label">経過時間</span>
            <span className="execution-info-value timer">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="execution-info-card">
            <span className="execution-info-label">累計時間</span>
            <span className="execution-info-value">{formatTime(totalSeconds)}</span>
          </div>
        </div>
        <div className="execution-actions">
          <button className="btn execution-btn" onClick={handleBreak}>
            {isRunning ? '休憩' : '再開'}
          </button>
          <button className="btn primary execution-btn" onClick={handleComplete}>
            完了
          </button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [nodes, setNodes] = useState([])
  const [selectedLargeId, setSelectedLargeId] = useState('')

  const updateTitle = (id, title) => {
    setNodes((prev) => updateTitleInTree(prev, id, title))
  }

  const handleAddLarge = () => {
    const created = createNode('新規大階層')
    setNodes((prev) => addLarge(prev, '新規大階層', created))
    setSelectedLargeId(created.id)
  }

  const handleAddMiddle = (largeId) => {
    setNodes((prev) => addMiddle(prev, largeId))
  }

  const handleAddSmall = (largeId, middleId) => {
    setNodes((prev) => addSmall(prev, largeId, middleId))
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LargeMiddleScreen
            nodes={nodes}
            selectedLargeId={selectedLargeId}
            setSelectedLargeId={setSelectedLargeId}
            onAddLarge={handleAddLarge}
            onAddMiddle={handleAddMiddle}
            onUpdateTitle={updateTitle}
          />
        }
      />
      <Route
        path="/middle/:largeId/:middleId"
        element={
          <MiddleSmallScreen
            nodes={nodes}
            onAddMiddle={handleAddMiddle}
            onAddSmall={handleAddSmall}
            onUpdateTitle={updateTitle}
          />
        }
      />
      <Route
        path="/tasks"
        element={<TaskListScreen nodes={nodes} />}
      />
      <Route path="/execute" element={<TaskExecutionScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
