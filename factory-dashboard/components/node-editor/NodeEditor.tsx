'use client'

/**
 * NodeEditor - Visual drag-and-drop block orchestration editor
 *
 * Allows users to visually compose SaaS Factory blocks by dragging them
 * onto a canvas and connecting their inputs/outputs.
 *
 * Built with pure React + SVG (no external graph library dependency).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BlockDefinition, NodeInstance, EdgeInstance } from './types'
import { BLOCK_REGISTRY, BLOCKS_BY_CATEGORY, BLOCK_REGISTRY_MAP } from './block-registry'
import { useNodeEditor } from './useNodeEditor'

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_WIDTH = 200
const NODE_HEADER_HEIGHT = 48
const PORT_HEIGHT = 28
const PORT_RADIUS = 6

// ─── Port Component ─────────────────────────────────────────────────────────

interface PortProps {
  nodeId: string
  portId: string
  portName: string
  portType: 'input' | 'output'
  index: number
  nodeX: number
  nodeY: number
  blockColor: string
  onPortClick: (nodeId: string, portId: string, portType: 'input' | 'output', x: number, y: number) => void
}

function Port({ nodeId, portId, portName, portType, index, nodeX, nodeY, blockColor, onPortClick }: PortProps) {
  const portY = nodeY + NODE_HEADER_HEIGHT + index * PORT_HEIGHT + PORT_HEIGHT / 2
  const portX = portType === 'input' ? nodeX : nodeX + NODE_WIDTH

  return (
    <g>
      <circle
        cx={portX}
        cy={portY}
        r={PORT_RADIUS}
        fill={blockColor}
        stroke="white"
        strokeWidth={2}
        style={{ cursor: 'crosshair' }}
        onClick={() => onPortClick(nodeId, portId, portType, portX, portY)}
      />
      <text
        x={portType === 'input' ? portX + PORT_RADIUS + 4 : portX - PORT_RADIUS - 4}
        y={portY + 4}
        fontSize={10}
        fill="#94a3b8"
        textAnchor={portType === 'input' ? 'start' : 'end'}
      >
        {portName}
      </text>
    </g>
  )
}

// ─── Node Component ─────────────────────────────────────────────────────────

interface NodeProps {
  node: NodeInstance
  blockDef: BlockDefinition
  isSelected: boolean
  onSelect: (nodeId: string) => void
  onRemove: (nodeId: string) => void
  onDragStart: (nodeId: string, e: React.MouseEvent) => void
  onPortClick: (nodeId: string, portId: string, portType: 'input' | 'output', x: number, y: number) => void
}

function NodeCard({ node, blockDef, isSelected, onSelect, onRemove, onDragStart, onPortClick }: NodeProps) {
  const nodeHeight =
    NODE_HEADER_HEIGHT +
    Math.max(blockDef.inputs.length, blockDef.outputs.length) * PORT_HEIGHT +
    12

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      style={{ cursor: 'grab' }}
      onMouseDown={(e) => {
        onSelect(node.id)
        onDragStart(node.id, e)
      }}
    >
      {/* Shadow */}
      <rect
        x={2}
        y={2}
        width={NODE_WIDTH}
        height={nodeHeight}
        rx={8}
        fill="rgba(0,0,0,0.3)"
      />

      {/* Body */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={nodeHeight}
        rx={8}
        fill="#1e293b"
        stroke={isSelected ? '#60a5fa' : blockDef.color}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Header */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={NODE_HEADER_HEIGHT}
        rx={8}
        fill={blockDef.color}
        clipPath={`inset(0 0 -8px 0)`}
      />
      <rect
        x={0}
        y={NODE_HEADER_HEIGHT - 8}
        width={NODE_WIDTH}
        height={8}
        fill={blockDef.color}
      />

      {/* Icon + Name */}
      <text x={12} y={20} fontSize={16}>{blockDef.icon}</text>
      <text x={36} y={20} fontSize={12} fontWeight="bold" fill="white">
        {blockDef.name}
      </text>
      <text x={12} y={36} fontSize={9} fill="rgba(255,255,255,0.7)">
        {blockDef.packageName}
      </text>

      {/* Remove button */}
      <g
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(node.id)
        }}
      >
        <circle cx={NODE_WIDTH - 12} cy={12} r={8} fill="rgba(0,0,0,0.3)" />
        <text x={NODE_WIDTH - 12} y={16} fontSize={10} fill="white" textAnchor="middle">×</text>
      </g>

      {/* Input Ports */}
      {blockDef.inputs.map((port, i) => (
        <g key={port.id} transform={`translate(${-node.position.x}, ${-node.position.y})`}>
          <Port
            nodeId={node.id}
            portId={port.id}
            portName={port.name}
            portType="input"
            index={i}
            nodeX={node.position.x}
            nodeY={node.position.y}
            blockColor={blockDef.color}
            onPortClick={onPortClick}
          />
        </g>
      ))}

      {/* Output Ports */}
      {blockDef.outputs.map((port, i) => (
        <g key={port.id} transform={`translate(${-node.position.x}, ${-node.position.y})`}>
          <Port
            nodeId={node.id}
            portId={port.id}
            portName={port.name}
            portType="output"
            index={i}
            nodeX={node.position.x}
            nodeY={node.position.y}
            blockColor={blockDef.color}
            onPortClick={onPortClick}
          />
        </g>
      ))}
    </g>
  )
}

// ─── Edge Component ─────────────────────────────────────────────────────────

interface EdgeProps {
  edge: EdgeInstance
  nodes: NodeInstance[]
  onRemove: (edgeId: string) => void
}

function EdgeLine({ edge, nodes, onRemove }: EdgeProps) {
  const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId)
  const targetNode = nodes.find((n) => n.id === edge.targetNodeId)
  if (!sourceNode || !targetNode) return null

  const sourceBlock = BLOCK_REGISTRY_MAP.get(sourceNode.blockId)
  const targetBlock = BLOCK_REGISTRY_MAP.get(targetNode.blockId)
  if (!sourceBlock || !targetBlock) return null

  const sourcePortIndex = sourceBlock.outputs.findIndex((p) => p.id === edge.sourcePortId)
  const targetPortIndex = targetBlock.inputs.findIndex((p) => p.id === edge.targetPortId)

  const x1 = sourceNode.position.x + NODE_WIDTH
  const y1 = sourceNode.position.y + NODE_HEADER_HEIGHT + sourcePortIndex * PORT_HEIGHT + PORT_HEIGHT / 2
  const x2 = targetNode.position.x
  const y2 = targetNode.position.y + NODE_HEADER_HEIGHT + targetPortIndex * PORT_HEIGHT + PORT_HEIGHT / 2

  const cx1 = x1 + 60
  const cx2 = x2 - 60

  const path = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#334155"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d={path}
        fill="none"
        stroke={sourceBlock.color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="0"
        opacity={0.8}
      />
      {/* Remove button at midpoint */}
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => onRemove(edge.id)}
      >
        <circle cx={midX} cy={midY} r={7} fill="#1e293b" stroke="#475569" strokeWidth={1} />
        <text x={midX} y={midY + 4} fontSize={10} fill="#94a3b8" textAnchor="middle">×</text>
      </g>
    </g>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  onAddBlock: (blockId: string) => void
}

function BlockSidebar({ onAddBlock }: SidebarProps) {
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('auth')

  const filteredBlocks = search
    ? BLOCK_REGISTRY.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.description.toLowerCase().includes(search.toLowerCase())
      )
    : null

  const categories = Object.keys(BLOCKS_BY_CATEGORY)

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-bold text-white mb-2">Blocks</h2>
        <input
          type="text"
          placeholder="Search blocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredBlocks ? (
          filteredBlocks.map((block) => (
            <BlockItem key={block.id} block={block} onAdd={() => onAddBlock(block.id)} />
          ))
        ) : (
          categories.map((category) => (
            <div key={category} className="mb-1">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white flex items-center justify-between"
              >
                <span>{category}</span>
                <span>{expandedCategory === category ? '▾' : '▸'}</span>
              </button>
              {expandedCategory === category &&
                BLOCKS_BY_CATEGORY[category].map((block) => (
                  <BlockItem key={block.id} block={block} onAdd={() => onAddBlock(block.id)} />
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BlockItem({ block, onAdd }: { block: BlockDefinition; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full text-left px-2 py-2 rounded hover:bg-slate-800 transition-colors group mb-0.5"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{block.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{block.name}</div>
          <div className="text-xs text-slate-500 truncate">{block.description}</div>
        </div>
        <span
          className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 font-bold"
        >
          +
        </span>
      </div>
    </button>
  )
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export interface NodeEditorProps {
  onExport?: (json: string) => void
  className?: string
}

export default function NodeEditor({ onExport, className = '' }: NodeEditorProps) {
  const {
    state,
    addNode,
    removeNode,
    moveNode,
    addEdge,
    removeEdge,
    clearGraph,
    exportGraph,
    validateGraph,
  } = useNodeEditor()

  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [pendingEdge, setPendingEdge] = useState<{
    nodeId: string
    portId: string
    portType: 'input' | 'output'
    x: number
    y: number
  } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null)

  // Drag handling
  const handleDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      const node = state.nodes.find((n) => n.id === nodeId)
      if (!node) return
      setDragging({
        nodeId,
        offsetX: e.clientX - node.position.x,
        offsetY: e.clientY - node.position.y,
      })
    },
    [state.nodes]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePos({ x, y })

      if (dragging) {
        moveNode(dragging.nodeId, {
          x: e.clientX - dragging.offsetX,
          y: e.clientY - dragging.offsetY,
        })
      }
    },
    [dragging, moveNode]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  // Port connection handling
  const handlePortClick = useCallback(
    (
      nodeId: string,
      portId: string,
      portType: 'input' | 'output',
      x: number,
      y: number
    ) => {
      if (!pendingEdge) {
        setPendingEdge({ nodeId, portId, portType, x, y })
        return
      }

      // Complete the connection
      if (pendingEdge.nodeId !== nodeId) {
        const source = pendingEdge.portType === 'output' ? pendingEdge : { nodeId, portId, portType, x, y }
        const target = pendingEdge.portType === 'input' ? pendingEdge : { nodeId, portId, portType, x, y }

        if (source.portType === 'output' && target.portType === 'input') {
          addEdge({
            sourceNodeId: source.nodeId,
            sourcePortId: source.portId,
            targetNodeId: target.nodeId,
            targetPortId: target.portId,
          })
        }
      }
      setPendingEdge(null)
    },
    [pendingEdge, addEdge]
  )

  const handleAddBlock = useCallback(
    (blockId: string) => {
      const x = 200 + Math.random() * 300
      const y = 100 + Math.random() * 200
      addNode(blockId, { x, y })
    },
    [addNode]
  )

  const handleExport = useCallback(() => {
    const json = exportGraph()
    onExport?.(json)
    // Download as file
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'saas-architecture.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [exportGraph, onExport])

  const handleValidate = useCallback(() => {
    setValidation(validateGraph())
  }, [validateGraph])

  return (
    <div className={`flex h-full bg-slate-950 ${className}`}>
      {/* Sidebar */}
      <BlockSidebar onAddBlock={handleAddBlock} />

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-700">
          <span className="text-sm font-semibold text-white">Block Editor</span>
          <div className="flex-1" />
          <span className="text-xs text-slate-400">{state.nodes.length} nodes · {state.edges.length} edges</span>
          <button
            onClick={handleValidate}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Validate
          </button>
          <button
            onClick={clearGraph}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Export JSON
          </button>
        </div>

        {/* Validation Messages */}
        {validation && (
          <div className={`px-4 py-2 text-xs ${validation.valid ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {validation.valid ? '✓ Graph is valid' : (
              <ul>
                {validation.errors.map((err, i) => (
                  <li key={i}>⚠ {err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* SVG Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {state.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-600">
                <div className="text-4xl mb-3">🧩</div>
                <div className="text-sm font-medium">Drag blocks from the sidebar to start building</div>
                <div className="text-xs mt-1">Connect ports to define data flow between blocks</div>
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: 'radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0) 0 0 / 24px 24px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={() => {
              if (!dragging) setSelectedNodeId(null)
              if (pendingEdge) setPendingEdge(null)
            }}
          >
            {/* Edges */}
            {state.edges.map((edge) => (
              <EdgeLine
                key={edge.id}
                edge={edge}
                nodes={state.nodes}
                onRemove={removeEdge}
              />
            ))}

            {/* Pending edge line */}
            {pendingEdge && (
              <line
                x1={pendingEdge.x}
                y1={pendingEdge.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="6 3"
                opacity={0.7}
              />
            )}

            {/* Nodes */}
            {state.nodes.map((node) => {
              const blockDef = BLOCK_REGISTRY_MAP.get(node.blockId)
              if (!blockDef) return null
              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  blockDef={blockDef}
                  isSelected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onRemove={removeNode}
                  onDragStart={handleDragStart}
                  onPortClick={handlePortClick}
                />
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
