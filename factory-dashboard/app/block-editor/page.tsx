import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Block Editor | SaaS Factory',
  description: 'Visual drag-and-drop orchestration for SaaS Factory blocks',
}

// Load NodeEditor client-side only (uses browser APIs)
const NodeEditor = dynamic(
  () => import('../../components/node-editor/NodeEditor'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-950 text-slate-500 text-sm">
      Loading editor...
    </div>
  )}
)

export default function BlockEditorPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <NodeEditor />
      </div>
    </div>
  )
}
