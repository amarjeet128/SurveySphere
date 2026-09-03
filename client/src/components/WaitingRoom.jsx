import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Users, Heart, ThumbsUp, Smile, Zap, Radio } from 'lucide-react';

const EMOJIS = [
  { id: 'heart', icon: Heart, color: 'text-rose-500' },
  { id: 'thumb', icon: ThumbsUp, color: 'text-blue-500' },
  { id: 'smile', icon: Smile, color: 'text-amber-500' },
  { id: 'zap', icon: Zap, color: 'text-amber-400' }
];

const WaitingRoom = ({ 
  config, 
  participantName, 
  participantsCount = 0,
  chatMessages = [],
  onSendMessage,
  onEmojiClick,
  activeAnimations = []
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = React.useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const renderDefault = () => (
    <motion.div 
      key="waiting-default"
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="text-center"
    >
      <div className="w-24 h-24 rounded-full bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center mx-auto mb-8 relative">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <Radio size={40} className="text-indigo-600" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {participantName}!</h1>
      <p className="text-slate-500 text-lg">Waiting for the presenter to start the poll...</p>
    </motion.div>
  );

  const renderModern = () => (
    <motion.div 
      key="waiting-modern"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl flex flex-col md:flex-row gap-8 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 h-[70vh] min-h-[500px]"
    >
      {/* Left Side: Welcome & Stats */}
      <div className="flex-1 flex flex-col justify-center items-start border-r border-slate-100 pr-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-semibold text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Waiting Room
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
          Hi {participantName},<br/>we're almost ready!
        </h1>
        <p className="text-slate-500 text-lg mb-8">The presentation will begin shortly. Chat with others while you wait.</p>
        
        <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 w-full">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{participantsCount}</div>
            <div className="text-sm font-medium text-slate-500">People waiting</div>
          </div>
        </div>
      </div>

      {/* Right Side: Chat & Emojis */}
      <div className="w-full md:w-[400px] flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
        <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-700">
          <MessageSquare size={18} className="text-indigo-500" /> Live Chat
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative">
          {chatMessages.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
              Be the first to say hello!
            </div>
          ) : (
            chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === participantName ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">{msg.sender}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${msg.sender === participantName ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-3 border-t border-slate-200 space-y-3">
          <div className="flex justify-center gap-2 px-2">
            {EMOJIS.map(e => (
              <button 
                key={e.id}
                onClick={() => onEmojiClick(e.id)}
                className={`p-2 rounded-full hover:bg-slate-100 transition-transform active:scale-75 ${e.color}`}
              >
                <e.icon size={22} fill="currentColor" className="opacity-80 hover:opacity-100" />
              </button>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-2 relative">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );

  const renderPlayful = () => (
    <motion.div 
      key="waiting-playful"
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="text-center w-full max-w-2xl relative"
    >
      <div className="mb-12 inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-lg shadow-indigo-100 border border-indigo-50">
        <Users size={20} className="text-indigo-500" />
        <span className="font-bold text-slate-700">{participantsCount} joined</span>
      </div>

      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6 drop-shadow-sm">
        Get Ready, {participantName}!
      </h1>
      <p className="text-slate-500 text-xl font-medium mb-16">The fun is about to begin. Tap to react!</p>
      
      <div className="flex justify-center gap-6">
        {EMOJIS.map(e => (
          <button 
            key={e.id}
            onClick={() => onEmojiClick(e.id)}
            className={`w-16 h-16 rounded-full bg-white shadow-xl shadow-slate-200 border-2 border-transparent hover:border-slate-100 flex items-center justify-center transition-all hover:-translate-y-2 active:scale-75 ${e.color}`}
          >
            <e.icon size={32} fill="currentColor" />
          </button>
        ))}
      </div>
    </motion.div>
  );

  return (
    <>
      {!config?.enabled || config?.template === 'default' 
        ? renderDefault() 
        : config?.template === 'modern' ? renderModern() : renderPlayful()}
      
      {/* Floating Emoji Animations Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {activeAnimations.map(anim => {
            const emojiObj = EMOJIS.find(e => e.id === anim.emoji) || EMOJIS[0];
            const Icon = emojiObj.icon;
            return (
              <motion.div
                key={anim.id}
                initial={{ opacity: 1, y: '100vh', x: anim.startX, scale: 0.5 }}
                animate={{ opacity: 0, y: '-20vh', x: anim.startX + (Math.random() * 100 - 50), scale: 1.5 }}
                transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
                className={`absolute bottom-0 left-0 ${emojiObj.color}`}
              >
                <Icon size={32} fill="currentColor" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
};

export default WaitingRoom;
