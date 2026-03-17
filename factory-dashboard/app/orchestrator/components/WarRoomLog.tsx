'use client'

import { useEffect, useRef } from 'react'
import type { AgentMessage } from '../types'

interface WarRoomLogProps {
  messages: AgentMessage[]
}

const AGENT_COLORS: Record<string, string> = {
  architect: 'text-blue-600',
  assembler: 'text-purple-600',
  'growth-hacker': 'text-green-600',
  compliance: 'text-orange-600',
  qa: 'text-pink-600',
  legal: 'text-red-600',
  deploy: 'text-indigo-600',
}

function getAgentColor(agent: string): string {
  const key = agent.toLowerCase().replace(/\s+/g, '-')
  return AGENT_COLORS[key] ?? 'text-blue-600'
}

export function WarRoomLog({ messages }: WarRoomLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <section className="mt-12 p-6 border rounded-lg bg-gray-50">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        AI War Room Communication Log
      </h2>

      <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-sm">
        {messages.length === 0 ? (
          <p className="text-gray-400 italic">No agent communication yet. Start the pipeline to see live updates.</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className={`font-bold shrink-0 ${getAgentColor(msg.agent)}`}>
                [{msg.agent}]
              </span>
              <p className="text-gray-700 break-words">{msg.message}</p>
              {msg.timestamp && (
                <span className="text-gray-400 text-xs shrink-0 ml-auto">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
