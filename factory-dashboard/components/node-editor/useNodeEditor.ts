'use client'

/**
 * useNodeEditor - State management hook for the visual block editor
 * Handles nodes, edges, selection, and graph serialization.
 */

import { useReducer, useCallback, useMemo } from 'react'
import {
  GraphState,
  NodeInstance,
  EdgeInstance,
  EditorAction,
} from './types'
import { BLOCK_REGISTRY_MAP } from './block-registry'

// ─── Initial State ──────────────────────────────────────────────────────────

const INITIAL_STATE: GraphState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function editorReducer(state: GraphState, action: EditorAction): GraphState {
  switch (action.type) {
    case 'ADD_NODE': {
      const node = action.payload as NodeInstance
      return { ...state, nodes: [...state.nodes, node] }
    }

    case 'REMOVE_NODE': {
      const nodeId = action.payload as string
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        // Remove all edges connected to this node
        edges: state.edges.filter(
          (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
        ),
      }
    }

    case 'MOVE_NODE': {
      const { id, position } = action.payload as { id: string; position: { x: number; y: number } }
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, position } : n
        ),
      }
    }

    case 'ADD_EDGE': {
      const edge = action.payload as EdgeInstance
      // Prevent duplicate edges
      const exists = state.edges.some(
        (e) =>
          e.sourceNodeId === edge.sourceNodeId &&
          e.sourcePortId === edge.sourcePortId &&
          e.targetNodeId === edge.targetNodeId &&
          e.targetPortId === edge.targetPortId
      )
      if (exists) return state
      return { ...state, edges: [...state.edges, edge] }
    }

    case 'REMOVE_EDGE': {
      const edgeId = action.payload as string
      return {
        ...state,
        edges: state.edges.filter((e) => e.id !== edgeId),
      }
    }

    case 'UPDATE_CONFIG': {
      const { nodeId, config } = action.payload as {
        nodeId: string
        config: Record<string, unknown>
      }
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
        ),
      }
    }

    case 'CLEAR':
      return INITIAL_STATE

    default:
      return state
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseNodeEditorReturn {
  state: GraphState
  addNode: (blockId: string, position?: { x: number; y: number }) => NodeInstance | null
  removeNode: (nodeId: string) => void
  moveNode: (nodeId: string, position: { x: number; y: number }) => void
  addEdge: (edge: Omit<EdgeInstance, 'id'>) => void
  removeEdge: (edgeId: string) => void
  updateConfig: (nodeId: string, config: Record<string, unknown>) => void
  clearGraph: () => void
  exportGraph: () => string
  importGraph: (json: string) => void
  getNodesByCategory: (category: string) => NodeInstance[]
  validateGraph: () => { valid: boolean; errors: string[] }
}

export function useNodeEditor(
  initialState?: Partial<GraphState>
): UseNodeEditorReturn {
  const [state, dispatch] = useReducer(editorReducer, {
    ...INITIAL_STATE,
    ...initialState,
  })

  const addNode = useCallback(
    (blockId: string, position = { x: 100, y: 100 }): NodeInstance | null => {
      const blockDef = BLOCK_REGISTRY_MAP.get(blockId)
      if (!blockDef) {
        console.warn(`Block "${blockId}" not found in registry`)
        return null
      }

      // Build default config from schema
      const defaultConfig: Record<string, unknown> = {}
      if (blockDef.configSchema) {
        for (const [key, field] of Object.entries(blockDef.configSchema)) {
          if (field.defaultValue !== undefined) {
            defaultConfig[key] = field.defaultValue
          }
        }
      }

      const node: NodeInstance = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        blockId,
        position,
        config: defaultConfig,
      }

      dispatch({ type: 'ADD_NODE', payload: node })
      return node
    },
    []
  )

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE_NODE', payload: nodeId })
  }, [])

  const moveNode = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      dispatch({ type: 'MOVE_NODE', payload: { id: nodeId, position } })
    },
    []
  )

  const addEdge = useCallback((edge: Omit<EdgeInstance, 'id'>) => {
    const fullEdge: EdgeInstance = {
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    dispatch({ type: 'ADD_EDGE', payload: fullEdge })
  }, [])

  const removeEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'REMOVE_EDGE', payload: edgeId })
  }, [])

  const updateConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      dispatch({ type: 'UPDATE_CONFIG', payload: { nodeId, config } })
    },
    []
  )

  const clearGraph = useCallback(() => {
    dispatch({ type: 'CLEAR', payload: null })
  }, [])

  const exportGraph = useCallback((): string => {
    return JSON.stringify(state, null, 2)
  }, [state])

  const importGraph = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as GraphState
      dispatch({ type: 'CLEAR', payload: null })
      for (const node of parsed.nodes) {
        dispatch({ type: 'ADD_NODE', payload: node })
      }
      for (const edge of parsed.edges) {
        dispatch({ type: 'ADD_EDGE', payload: edge })
      }
    } catch (e) {
      console.error('Failed to import graph:', e)
    }
  }, [])

  const getNodesByCategory = useCallback(
    (category: string): NodeInstance[] => {
      return state.nodes.filter((node) => {
        const blockDef = BLOCK_REGISTRY_MAP.get(node.blockId)
        return blockDef?.category === category
      })
    },
    [state.nodes]
  )

  const validateGraph = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check that all edges reference valid nodes and ports
    for (const edge of state.edges) {
      const sourceNode = state.nodes.find((n) => n.id === edge.sourceNodeId)
      const targetNode = state.nodes.find((n) => n.id === edge.targetNodeId)

      if (!sourceNode) {
        errors.push(`Edge ${edge.id}: source node "${edge.sourceNodeId}" not found`)
        continue
      }
      if (!targetNode) {
        errors.push(`Edge ${edge.id}: target node "${edge.targetNodeId}" not found`)
        continue
      }

      const sourceBlock = BLOCK_REGISTRY_MAP.get(sourceNode.blockId)
      const targetBlock = BLOCK_REGISTRY_MAP.get(targetNode.blockId)

      if (!sourceBlock?.outputs.find((p) => p.id === edge.sourcePortId)) {
        errors.push(
          `Edge ${edge.id}: source port "${edge.sourcePortId}" not found on block "${sourceNode.blockId}"`
        )
      }
      if (!targetBlock?.inputs.find((p) => p.id === edge.targetPortId)) {
        errors.push(
          `Edge ${edge.id}: target port "${edge.targetPortId}" not found on block "${targetNode.blockId}"`
        )
      }
    }

    // Check required inputs are connected
    for (const node of state.nodes) {
      const blockDef = BLOCK_REGISTRY_MAP.get(node.blockId)
      if (!blockDef) continue

      for (const input of blockDef.inputs) {
        if (input.required) {
          const isConnected = state.edges.some(
            (e) => e.targetNodeId === node.id && e.targetPortId === input.id
          )
          if (!isConnected) {
            errors.push(
              `Node "${node.id}" (${blockDef.name}): required input "${input.name}" is not connected`
            )
          }
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }, [state])

  return {
    state,
    addNode,
    removeNode,
    moveNode,
    addEdge,
    removeEdge,
    updateConfig,
    clearGraph,
    exportGraph,
    importGraph,
    getNodesByCategory,
    validateGraph,
  }
}
