/**
 * Node-Based Block Editor - Type Definitions
 * Visual drag-and-drop orchestration for SaaS Factory blocks
 */

export type BlockCategory =
  | 'auth'
  | 'database'
  | 'payments'
  | 'analytics'
  | 'ai'
  | 'infra'
  | 'ui'
  | 'integration'

export interface BlockDefinition {
  id: string
  name: string
  description: string
  category: BlockCategory
  packageName: string
  color: string
  icon: string
  inputs: PortDefinition[]
  outputs: PortDefinition[]
  configSchema?: Record<string, ConfigField>
}

export interface PortDefinition {
  id: string
  name: string
  type: 'data' | 'event' | 'config'
  required: boolean
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select'
  label: string
  defaultValue?: unknown
  options?: string[] // for 'select' type
  description?: string
}

export interface NodeInstance {
  id: string
  blockId: string
  position: { x: number; y: number }
  config: Record<string, unknown>
  label?: string
}

export interface EdgeInstance {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface GraphState {
  nodes: NodeInstance[]
  edges: EdgeInstance[]
  viewport: { x: number; y: number; zoom: number }
}

export interface EditorAction {
  type:
    | 'ADD_NODE'
    | 'REMOVE_NODE'
    | 'MOVE_NODE'
    | 'ADD_EDGE'
    | 'REMOVE_EDGE'
    | 'UPDATE_CONFIG'
    | 'CLEAR'
  payload: unknown
}
