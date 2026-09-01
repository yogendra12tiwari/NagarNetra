import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, X, Search } from 'lucide-react';
import { askRagAgent } from '../services/gemini';

export default function FloatingSearchChat({ points }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Hello! I am the NagarNetra AI Assistant for Lucknow. You can ask me about LMC wards, cleanliness status, or official contact details.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const SUGGESTION_CHIPS = [
    "Where are the worst garbage hotspots?",
    "What areas need cleanup today?",
    "How do I report a garbage dump?",
    "How does NagarNetra prioritize complaints?"
  ];

  const submitQuestion = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage = { role: 'user', text: queryText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.filter(m => !m.text.includes('NagarNetra AI Assistant for Lucknow'));
      const replyText = await askRagAgent(queryText.trim(), chatHistory, points);
      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (error) {
      console.error("RAG Error:", error);
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
    <>
      {/* Search Bar Input (Triggers Modal) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] w-[min(480px,90vw)]">
        <div 
          onClick={() => setIsOpen(true)}
          className="bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xl rounded-full p-2 pl-4 flex items-center gap-3 cursor-pointer hover:border-emerald-400 hover:shadow-2xl transition-all group"
        >
          <Search size={18} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
          <span className="text-sm font-medium text-gray-500 flex-1 truncate">
            Ask AI about wards, corporators, or status...
          </span>
          <button className="bg-emerald-600 group-hover:bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors">
            Ask AI
          </button>
        </div>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[min(560px,94vw)] h-[min(620px,85vh)] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Bot size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight">NagarNetra AI</h2>
                  <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">Lucknow Municipal Corporation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-3xl rounded-tr-sm shadow-md' 
                        : 'bg-gray-100/80 text-gray-800 rounded-3xl rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1.5 px-2 font-medium uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'AI Agent'}
                  </span>
                </div>
              ))}

              {/* Suggestion Chips */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 my-1">
                  {SUGGESTION_CHIPS.map((chipText, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => submitQuestion(chipText)}
                      disabled={isLoading}
                      className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 rounded-full px-3.5 py-2 font-medium transition-all text-left active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      💡 {chipText}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-start">
                  <div className="bg-gray-100/80 rounded-3xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2 text-gray-500 text-[15px]">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask NagarNetra AI a question..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
