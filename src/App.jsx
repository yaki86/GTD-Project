import { useRef, useState } from 'react'
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

const updateTitleInTree = (nodes, id, title) =>
  nodes.map((node) => {
    if (node.id === id) {
      return { ...node, title }
    }
    return { ...node, children: updateTitleInTree(node.children, id, title) }
  })

const addChildToTree = (nodes, parentId) =>
  nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, createNode()] }
    }
    return { ...node, children: addChildToTree(node.children, parentId) }
  })

const insertAfter = (nodes, targetId, newNode) => {
  const index = nodes.findIndex((node) => node.id === targetId)
  if (index === -1) {
    return nodes
  }
  return [...nodes.slice(0, index + 1), newNode, ...nodes.slice(index + 1)]
}

const addSiblingInTree = (nodes, parentId, nodeId) => {
  if (parentId == null) {
    return insertAfter(nodes, nodeId, createNode())
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: insertAfter(node.children, nodeId, createNode()) }
    }
    return {
      ...node,
      children: addSiblingInTree(node.children, parentId, nodeId),
    }
  })
}

const BASE_SIZES = [320, 260, 220, 200]
const HEADER_HEIGHT = 110
const CHILD_GAP = 12
const NODE_PADDING = 24

const baseSizeForDepth = (depth) =>
  BASE_SIZES[Math.min(depth, BASE_SIZES.length - 1)]

const columnsForChildren = (count) => (count === 0 ? 1 : Math.ceil(Math.sqrt(count)))

const computeLayout = (node, depth) => {
  const baseSize = baseSizeForDepth(depth)
  if (node.children.length === 0) {
    return {
      size: baseSize,
      childMaxSize: baseSizeForDepth(depth + 1),
      columns: 1,
    }
  }

  const childLayouts = node.children.map((child) => computeLayout(child, depth + 1))
  const maxChildSize = Math.max(
    ...childLayouts.map((child) => child.size),
    baseSizeForDepth(depth + 1),
  )
  const columns = columnsForChildren(node.children.length)
  const rows = Math.ceil(node.children.length / columns)
  const childrenWidth = columns * maxChildSize + (columns - 1) * CHILD_GAP
  const childrenHeight = rows * maxChildSize + (rows - 1) * CHILD_GAP
  const contentWidth = Math.max(childrenWidth, baseSize * 0.6)
  const contentHeight = HEADER_HEIGHT + childrenHeight
  const rectWidth = contentWidth + NODE_PADDING * 2
  const rectHeight = contentHeight + NODE_PADDING * 2
  const diameter = Math.ceil(Math.sqrt(rectWidth ** 2 + rectHeight ** 2))

  return {
    size: Math.max(baseSize, diameter),
    childMaxSize: maxChildSize,
    columns,
  }
}

const TaskNode = ({
  node,
  parentId,
  onAddChild,
  onAddSibling,
  onUpdateTitle,
  index,
  depth,
}) => {
  const layout = computeLayout(node, depth)

  return (
    <div
      className="node"
      data-depth={depth}
      style={{
        '--i': index,
        '--node-size': `${layout.size}px`,
        '--node-padding': `${NODE_PADDING}px`,
        '--child-gap': `${CHILD_GAP}px`,
        '--child-columns': layout.columns,
        '--child-max-size': `${layout.childMaxSize}px`,
      }}
    >
      <div className="node-card">
        <input
          className="node-title"
          value={node.title}
          onChange={(event) => onUpdateTitle(node.id, event.target.value)}
        placeholder="タスク名"
      />
      <div className="node-actions">
        <button className="action-btn" onClick={() => onAddChild(node.id)}>
          +子タスク
        </button>
        <button className="action-btn ghost" onClick={() => onAddSibling(parentId, node.id)}>
          +同階層
        </button>
      </div>
      {node.children.length > 0 && (
        <div className="children">
          {node.children.map((child, childIndex) => (
            <TaskNode
              key={child.id}
              node={child}
              parentId={node.id}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onUpdateTitle={onUpdateTitle}
              index={childIndex}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

function App() {
  const [rootTitle, setRootTitle] = useState('')
  const [nodes, setNodes] = useState([])
  const [zoom, setZoom] = useState(1)
  const dragState = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 })

  const addRootNode = () => {
    const trimmed = rootTitle.trim()
    if (!trimmed) {
      return
    }
    setNodes((prev) => [...prev, createNode(trimmed)])
    setRootTitle('')
  }

  const updateTitle = (id, title) => {
    setNodes((prev) => updateTitleInTree(prev, id, title))
  }

  const addChild = (parentId) => {
    setNodes((prev) => addChildToTree(prev, parentId))
  }

  const addSibling = (parentId, nodeId) => {
    setNodes((prev) => addSiblingInTree(prev, parentId, nodeId))
  }

  const clampZoom = (value) => Math.min(1.6, Math.max(0.5, value))
  const handleWheelZoom = (event) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setZoom((value) => clampZoom(value + direction * 0.08))
  }

  const handleDragStart = (event) => {
    const target = event.currentTarget
    dragState.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      left: target.scrollLeft,
      top: target.scrollTop,
    }
  }

  const handleDragMove = (event) => {
    if (!dragState.current.active) {
      return
    }
    const target = event.currentTarget
    const dx = event.clientX - dragState.current.x
    const dy = event.clientY - dragState.current.y
    target.scrollLeft = dragState.current.left - dx
    target.scrollTop = dragState.current.top - dy
  }

  const handleDragEnd = () => {
    dragState.current.active = false
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Task Atlas</p>
        <h1>タスクを右へ、下へ。思考をほどく!!!!!!</h1>
        <p className="sub">
          右クリックで子タスク、下クリックで同階層。1クリックで箱を増やし、細分化を加速。
        </p>
        <div className="root-input">
          <input
            value={rootTitle}
            onChange={(event) => setRootTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                addRootNode()
              }
            }}
            placeholder="大項目を入力"
          />
          <button className="primary" onClick={addRootNode}>
            大項目を追加
          </button>
        </div>
        <p className="hint">Enterでも追加できます</p>
      </header>

      <main className="canvas">
        <div className="canvas-header">
          <p className="canvas-title">タスクマップ</p>
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
            >
              −
            </button>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
            >
              ＋
            </button>
            <button className="zoom-btn ghost" onClick={() => setZoom(1)}>
              100%
            </button>
          </div>
        </div>
        <div
          className="canvas-body"
          onWheel={handleWheelZoom}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {nodes.length === 0 ? (
            <div className="empty">
              <h2>まずは大項目を1つ追加</h2>
              <p>子タスクや同階層を増やして、円の中に構造を作りましょう。</p>
            </div>
          ) : (
            <div className="tree" style={{ transform: `scale(${zoom})` }}>
              {nodes.map((node, index) => (
                <TaskNode
                  key={node.id}
                  node={node}
                  parentId={null}
                  onAddChild={addChild}
                  onAddSibling={addSibling}
                  onUpdateTitle={updateTitle}
                  index={index}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
