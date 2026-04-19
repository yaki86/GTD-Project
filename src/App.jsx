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

const BUBBLE_SIZE_PRESETS = {
  large: { min: 152, max: 208, height: 330 },
  middle: { min: 132, max: 172, height: 320 },
  small: { min: 110, max: 146, height: 250 },
}

const BUBBLE_SPEED_RANGE = {
  large: { min: 0.34, max: 0.58 },
  middle: { min: 0.3, max: 0.5 },
  small: { min: 0.26, max: 0.44 },
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const hashSeed = (value) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

const seededRandom = (seed) => {
  let current = seed % 2147483647
  if (current <= 0) {
    current += 2147483646
  }

  return () => {
    current = (current * 16807) % 2147483647
    return (current - 1) / 2147483646
  }
}

const createBubbleLayout = (items, width, height, sizeKey) => {
  const preset = BUBBLE_SIZE_PRESETS[sizeKey]
  const speedRange = BUBBLE_SPEED_RANGE[sizeKey]
  const maxWidth = Math.max(width, preset.min + 24)
  const maxHeight = Math.max(height, preset.min + 24)
  const density = sizeKey === 'large' ? 0.72 : sizeKey === 'middle' ? 0.82 : 0.92
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(items.length || 1) * density))
  const rowCount = Math.max(1, Math.ceil((items.length || 1) / columnCount))
  const cellWidth = maxWidth / columnCount
  const cellHeight = maxHeight / rowCount

  return items.map((item, index) => {
    const random = seededRandom(hashSeed(`${item.id}-${index}-${sizeKey}`))
    const column = index % columnCount
    const row = Math.floor(index / columnCount)
    const cellX = column * cellWidth
    const cellY = row * cellHeight
    const safeWidth = Math.max(cellWidth - 8, preset.min)
    const safeHeight = Math.max(cellHeight - 8, preset.min)
    const size = clamp(
      preset.min + random() * (preset.max - preset.min),
      preset.min,
      Math.min(preset.max, safeWidth, safeHeight),
    )
    const xLimit = Math.max(cellWidth - size - 4, 0)
    const yLimit = Math.max(cellHeight - size - 4, 0)
    const x = cellX + 2 + random() * xLimit
    const y = cellY + 2 + random() * yLimit
    const direction = random() * Math.PI * 2
    const speed = speedRange.min + random() * (speedRange.max - speedRange.min)

    return {
      id: item.id,
      size,
      x,
      y,
      cellX: cellX + 2,
      cellY: cellY + 2,
      cellWidth: Math.max(cellWidth - 4, size),
      cellHeight: Math.max(cellHeight - 4, size),
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
    }
  })
}

const BubbleField = ({ items, sizeKey, renderBubble, getShellClassName = () => '' }) => {
  const fieldRef = useRef(null)
  const shellRefs = useRef(new Map())
  const animationRef = useRef(null)
  const layoutRef = useRef([])
  const resizeObserverRef = useRef(null)
  const [layoutVersion, setLayoutVersion] = useState(0)

  useEffect(() => {
    const field = fieldRef.current
    if (!field || items.length === 0) {
      layoutRef.current = []
      setLayoutVersion((value) => value + 1)
      return undefined
    }

    const updateLayout = () => {
      const nextWidth = field.clientWidth
      const nextHeight = field.clientHeight
      layoutRef.current = createBubbleLayout(items, nextWidth, nextHeight, sizeKey)
      layoutRef.current.forEach((bubble) => {
        const shell = shellRefs.current.get(bubble.id)
        if (!shell) {
          return
        }
        shell.style.width = `${bubble.size}px`
        shell.style.height = `${bubble.size}px`
        shell.style.transform = `translate(${bubble.x}px, ${bubble.y}px)`
      })
      setLayoutVersion((value) => value + 1)
    }

    updateLayout()

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateLayout()
      })
      resizeObserverRef.current.observe(field)
    } else {
      window.addEventListener('resize', updateLayout)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      } else {
        window.removeEventListener('resize', updateLayout)
      }
    }
  }, [items, sizeKey])

  useEffect(() => {
    const field = fieldRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!field || items.length === 0 || reduceMotion) {
      return undefined
    }

    let lastFrame = performance.now()

    const animate = (now) => {
      const delta = Math.min(now - lastFrame, 32)
      lastFrame = now
      const maxWidth = field.clientWidth
      const maxHeight = field.clientHeight

      layoutRef.current = layoutRef.current.map((bubble) => {
        const cellRight = Math.min(bubble.cellX + bubble.cellWidth - bubble.size, maxWidth - bubble.size)
        const cellBottom = Math.min(
          bubble.cellY + bubble.cellHeight - bubble.size,
          maxHeight - bubble.size,
        )
        const limitLeft = bubble.cellX
        const limitTop = bubble.cellY
        let x = bubble.x + bubble.vx * delta
        let y = bubble.y + bubble.vy * delta
        let vx = bubble.vx
        let vy = bubble.vy
        const drift = ((Math.sin(now / 900 + bubble.size) + 1) / 2 - 0.5) * 0.014 * delta
        vx += drift
        vy -= drift * 0.75

        if (x <= limitLeft || x >= cellRight) {
          vx *= -1
          vy += (Math.random() - 0.5) * 0.14
          x = clamp(x, limitLeft, cellRight)
        }

        if (y <= limitTop || y >= cellBottom) {
          vy *= -1
          vx += (Math.random() - 0.5) * 0.14
          y = clamp(y, limitTop, cellBottom)
        }

        vx = clamp(vx, -0.72, 0.72)
        vy = clamp(vy, -0.72, 0.72)

        const nextBubble = { ...bubble, x, y, vx, vy }
        const shell = shellRefs.current.get(nextBubble.id)
        if (shell) {
          shell.style.transform = `translate(${nextBubble.x}px, ${nextBubble.y}px)`
        }
        return nextBubble
      })

      animationRef.current = window.requestAnimationFrame(animate)
    }

    animationRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [items.length])

  const height = BUBBLE_SIZE_PRESETS[sizeKey].height

  return (
    <div
      ref={fieldRef}
      className={`list bubble-field bubble-field-${sizeKey}`}
      style={{ minHeight: `${height}px` }}
    >
      {items.map((item, index) => {
        const bubble = layoutRef.current[index]
        const style = bubble
          ? {
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              transform: `translate(${bubble.x}px, ${bubble.y}px)`,
            }
          : undefined

        return (
          <div
            key={item.id}
            ref={(node) => {
              if (node) {
                shellRefs.current.set(item.id, node)
              } else {
                shellRefs.current.delete(item.id)
              }
            }}
            className={`bubble-shell ${getShellClassName(item)}`.trim()}
            style={style}
            data-layout-version={layoutVersion}
          >
            {renderBubble(item)}
          </div>
        )
      })}
    </div>
  )
}

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

const addLarge = (nodes, title = '新規大グループ', presetNode = null) => [
  ...nodes,
  presetNode ?? createNode(title),
]

const addMiddle = (nodes, largeId, title = '新規中グループ') =>
  nodes.map((node) => {
    if (node.id !== largeId) {
      return node
    }
    return {
      ...node,
      children: [...node.children, createNode(title)],
    }
  })

const addSmall = (nodes, largeId, middleId, title = '新規小グループ') =>
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
    <div className="screen bubble-scene large-middle-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>大グループ / 中グループ</h1>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={onAddLarge}>
            大グループタスク追加
          </button>
          <button className="btn" onClick={openAddMiddleModal} disabled={nodes.length === 0}>
            中グループタスク追加
          </button>
          <button className="btn ghost" onClick={() => navigate('/tasks')}>
            タスク一覧
          </button>
        </div>
      </header>

      {nodes.length === 0 ? (
        <section className="empty-state">
          <h2>まず大グループを追加</h2>
          <p>右上の「大グループタスク追加」から開始できます。</p>
        </section>
      ) : (
        <section className="board two-column">
          <div className="panel bubble-panel large-panel">
            <h2>大グループ</h2>
            <BubbleField
              items={nodes}
              sizeKey="large"
              getShellClassName={(large) => (selectedLarge?.id === large.id ? 'is-active' : '')}
              renderBubble={(large) => (
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
                    placeholder="大グループ名"
                  />
                </div>
              )}
            />
          </div>

          <div className="panel bubble-panel middle-panel">
            <h2>中グループ</h2>
            {!selectedLarge || selectedLarge.children.length === 0 ? (
              <p className="panel-empty">中グループがありません。右上から追加してください。</p>
            ) : (
              <BubbleField
                items={selectedLarge.children}
                sizeKey="middle"
                getShellClassName={() => ''}
                renderBubble={(middle) => (
                  <div
                    key={middle.id}
                    className="list-item middle-card selectable"
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
                      placeholder="中グループ名"
                    />
                    <span className="link-hint">クリックで中小画面へ</span>
                  </div>
                )}
              />
            )}
          </div>
        </section>
      )}

      {showAddMiddleModal && (
        <SelectionModal
          title="中グループの追加先を選択"
          description="どの大グループに中グループを追加するかを選んでください。"
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
    <div className="screen bubble-scene middle-small-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>中グループ / 小グループ</h1>
          <p className="subtitle">
            {large.title || '大グループ未設定'} / {middle.title || '中グループ未設定'}
          </p>
        </div>
        <div className="toolbar">
          <button
            className="btn ghost"
            onClick={() => navigate('/', { state: { selectedLargeId: large.id } })}
          >
            大グループへ遷移
          </button>
          <button className="btn" onClick={handleAddMiddle}>
            中グループタスク追加
          </button>
          <button className="btn primary" onClick={openAddSmallModal}>
            小グループタスク追加
          </button>
          <button className="btn ghost" onClick={() => navigate('/tasks')}>
            タスク一覧
          </button>
        </div>
      </header>

      <section className="board two-column">
        <div className="panel bubble-panel middle-panel">
          <h2>中グループ（同じ大グループ配下）</h2>
          <BubbleField
            items={middleOptions}
            sizeKey="middle"
            getShellClassName={(item) => (item.id === middle.id ? 'is-active' : '')}
            renderBubble={(item) => (
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
                  placeholder="中グループ名"
                />
              </div>
            )}
          />
        </div>

        <div className="panel bubble-panel small-panel">
          <h2>小グループ</h2>
          {middle.children.length === 0 ? (
            <p className="panel-empty">小グループがありません。右上から追加してください。</p>
          ) : (
            <BubbleField
              items={middle.children}
              sizeKey="small"
              getShellClassName={() => ''}
              renderBubble={(small) => (
                <div key={small.id} className="list-item">
                  <input
                    value={small.title}
                    onChange={(event) => onUpdateTitle(small.id, event.target.value)}
                    placeholder="小グループ名"
                  />
                </div>
              )}
            />
          )}
        </div>
      </section>

      {showAddSmallModal && (
        <SelectionModal
          title="小グループの追加先を選択"
          description="どの中グループに小グループを追加するかを選んでください。"
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
    <div className="screen bubble-scene list-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">GTD</p>
          <h1>タスク一覧</h1>
        </div>
        <div className="toolbar">
          <button className="btn ghost" onClick={() => navigate('/')}>
            大グループへ戻る
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="empty-state">
          <h2>タスクがありません</h2>
          <p>まず大グループ画面からタスクを追加してください。</p>
        </section>
      ) : (
        <section className="board">
          <div className="task-table">
            <div className="task-table-header">
              <div className="task-table-cell">大グループ</div>
              <div className="task-table-cell">中グループ</div>
              <div className="task-table-cell">小グループ</div>
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
    <div className="screen bubble-scene execution-screen">
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
    const created = createNode('新規大グループ')
    setNodes((prev) => addLarge(prev, '新規大グループ', created))
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
