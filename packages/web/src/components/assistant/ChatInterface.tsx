'use client';

import { useEffect, useRef, useState } from 'react';

import { BookOpen, Bot, Loader2, Send, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; source: string; category: string }[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'What does high LDL cholesterol mean?',
  'How can I lower my blood pressure naturally?',
  'What is a healthy BMI range?',
  'How does smoking affect heart health?',
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      const data = (await res.json()) as { answer?: string; sources?: ChatMessage['sources']; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer ?? 'No answer returned.',
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'I could not reach the medical assistant service. If you are running locally, ensure `OPENAI_API_KEY` is set and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const askSuggested = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] max-h-[700px] flex-col">
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cv-teal/10">
              <Bot className="h-8 w-8 text-cv-teal" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">CardioVault AI assistant</h3>
            <p className="mx-auto mb-6 max-w-md text-gray-400">
              Ask questions about cardiovascular health. Answers are grounded in curated literature excerpts with
              inline citations.
            </p>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => askSuggested(q)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:border-cv-teal/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cv-teal/40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cv-teal/10">
                <Bot className="h-4 w-4 text-cv-teal" aria-hidden />
              </div>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'rounded-br-md bg-cv-red text-white'
                  : 'rounded-bl-md border border-gray-700 bg-gray-800 text-gray-100',
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                    <BookOpen className="h-3 w-3" aria-hidden />
                    Sources
                  </div>
                  <ol className="ml-4 list-decimal space-y-1 text-xs text-gray-500">
                    {msg.sources.map((s) => (
                      <li key={`${s.title}::${s.source}`}>
                        {s.title} — {s.source}{' '}
                        <span className="text-gray-600">({s.category})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cv-red/10">
                <User className="h-4 w-4 text-cv-red" aria-hidden />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cv-teal/10">
              <Loader2 className="h-4 w-4 animate-spin text-cv-teal" aria-hidden />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-gray-700 bg-gray-800 px-4 py-3">
              <p className="text-sm text-gray-400">Searching medical literature…</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about cardiovascular health…"
          className="flex-1 border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus-visible:border-cv-teal focus-visible:ring-cv-teal/30"
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-cv-teal px-4 text-slate-950 hover:bg-teal-400"
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
