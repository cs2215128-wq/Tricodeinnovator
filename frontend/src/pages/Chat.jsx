import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, BookOpen, ChevronDown, ChevronUp, Sparkles, MessageSquare } from 'lucide-react';
import { researchAPI } from '../services/api';
import toast from 'react-hot-toast';

const CitationChip = ({ text }) => {
  // Parse [Document, Page] citations
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <span className="leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const content = part.slice(1, -1);
          return (
            <span key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium mx-0.5 cursor-help"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
              title={`Source: ${content}`}
            >
              <BookOpen size={10} />
              {content}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const MessageBubble = ({ message }) => {
  const [showChunks, setShowChunks] = useState(false);
  const isUser = message.role === 'user';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#06b6d4,#10b981)' }}>
        {isUser ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
      </div>

      <div className={`max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Message Content */}
        <div className="p-4 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isUser ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))' : 'rgba(30,30,48,0.8)',
            border: `1px solid ${isUser ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
            color: '#f1f5f9',
          }}>
          {message.role === 'assistant' ? <CitationChip text={message.content} /> : message.content}
        </div>

        {/* Retrieved Chunks Accordion */}
        {message.context_chunks?.length > 0 && (
          <button onClick={() => setShowChunks(!showChunks)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
            <BookOpen size={11} />
            {message.context_chunks.length} source chunks
            {showChunks ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}

        <AnimatePresence>
          {showChunks && message.context_chunks && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden w-full">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {message.context_chunks.map((chunk, i) => (
                  <div key={i} className="p-3 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>{chunk.source_title}</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>{chunk.page_or_timestamp}</span>
                      <span className="ml-auto badge badge-success">{(parseFloat(chunk.similarity_score) * 100).toFixed(0)}% match</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      {chunk.content.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm ResearchPilot AI. Ask me anything about your uploaded research papers — I'll answer with precise inline citations. Upload papers first from the Dashboard.",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await researchAPI.chat(q);
      const { answer, context_chunks, chunks_retrieved } = res.data.data;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer,
        context_chunks,
        chunks_retrieved,
      }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Chat failed');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'What are the main methodologies used?',
    'What limitations did the papers identify?',
    'Summarize the key findings',
    'What datasets were used across papers?',
  ];

  return (
    <div className="flex flex-col h-screen p-6" style={{ maxHeight: '100vh' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Evidence Chat
        </h1>
        <p className="text-sm" style={{ color: '#64748b' }}>RAG-powered research assistant with inline citations</p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#10b981)' }}>
              <Bot size={14} color="white" />
            </div>
            <div className="p-4 rounded-2xl"
              style={{ background: 'rgba(30,30,48,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#8b5cf6', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#06b6d4', animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Sparkles size={10} className="inline mr-1" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            className="input-field resize-none pr-4"
            style={{ minHeight: 52, maxHeight: 140, paddingTop: 14, paddingBottom: 14 }}
            placeholder="Ask about your research papers..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
          />
        </div>
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="btn-primary px-4 py-3.5 rounded-xl shrink-0">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
