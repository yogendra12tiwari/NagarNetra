import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { askRagAgent } from '../services/gemini';

export default function PublicRagChat({ points }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Hello! I am the NagarNetra AI Assistant. You can ask me about ward details, cleanliness status, or departmental jurisdictions.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const SUGGESTION_CHIPS = [
    "Where are the worst garbage hotspots?",
    "What areas need cleanup today?",
    "How do I report a garbage dump?",
    "How does NagarNetra prioritize complaints?"
  ];

  const submitQuestion = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage = queryText.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chatHistory = messages.filter(m => !m.text.includes('NagarNetra AI Assistant'));
      const responseText = await askRagAgent(userMessage, chatHistory, points);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      console.error("[PublicRagChat] Error:", err.message);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I am having trouble fetching official details right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    submitQuestion(input);
  };

  return (
    <aside className="w-[300px] shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-inner z-[10]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-emerald-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm text-white">
          <Bot size={18} />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">AI Assistant</h2>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">NagarNetra RAG Agent</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-gray-400 mt-1 px-1 font-medium">
              {msg.role === 'user' ? 'You' : 'AI Agent'}
            </span>
          </div>
        ))}

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="flex flex-col gap-1.5 my-1">
            {SUGGESTION_CHIPS.map((chipText, index) => (
              <button
                key={index}
                type="button"
                onClick={() => submitQuestion(chipText)}
                disabled={isLoading}
                className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 rounded-xl px-3 py-1.5 font-medium transition-all text-left active:scale-95 disabled:opacity-50 shadow-xs leading-tight"
              >
                💡 {chipText}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="text-emerald-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about wards..."
            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </aside>
  );
}
