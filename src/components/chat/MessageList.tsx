import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { renderMessage } from '@/lib/chat/markdown'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  messages: Message[]
  loading?: boolean
  readonly?: boolean
}

export function MessageList({ messages, loading, readonly }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!readonly) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, readonly])

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm',
            )}
          >
            {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
