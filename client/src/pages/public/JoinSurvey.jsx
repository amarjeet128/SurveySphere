import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';

const JoinSurvey = () => {
  const [name, setName] = useState('');
  const [surveyCode, setSurveyCode] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !surveyCode.trim()) return;
    
    localStorage.setItem('surveyRespondent', JSON.stringify({ name }));
    navigate(`/s/${surveyCode.toUpperCase()}`);
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div 
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 bg-[#0a0a1a] flex items-center justify-center font-sans overflow-hidden"
        >
          {/* High-Tech Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

          {/* Starry Effect (Generated Stars) */}
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random(),
                boxShadow: '0 0 10px 2px rgba(255,255,255,0.8)'
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [Math.random(), 1, Math.random()],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          ))}

          {/* Flying Paper Rocket */}
          <motion.div
            initial={{ x: '-20vw', y: '60vh', opacity: 0, rotate: 10 }}
            animate={{ 
              x: '110vw', 
              y: ['60vh', '40vh', '50vh', '30vh'],
              opacity: [0, 1, 1, 0.8],
              rotate: [10, -5, 15, 0]
            }}
            transition={{ 
              duration: 8, 
              ease: 'easeInOut' 
            }}
            className="absolute z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] text-cyan-400"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              {/* Paper Rocket / Paper Airplane Shape */}
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </motion.div>

          <div className="text-center text-white relative z-20">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="bg-black/40 p-5 rounded-3xl inline-block mb-4 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
            >
              <FileText size={40} className="text-white animate-pulse" />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="text-lg font-medium text-indigo-200/90 mb-1"
            >
              Welcome to
            </motion.h1>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.6 }}
              className="text-4xl font-bold tracking-tight text-white drop-shadow-md"
            >
              SurveySphere
            </motion.h2>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-screen overflow-hidden bg-[#f4f6f8] flex flex-col font-sans"
        >
          {/* Header matching the image style */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
            <h1 className="text-xl font-bold text-indigo-700 tracking-wide">SURVEYSPHERE PORTAL</h1>
            <span className="text-sm text-indigo-600/80 font-medium">Secure Respondent Portal</span>
          </header>

          <main className="flex-1 flex flex-col items-center pt-16 px-6">
            {/* Logo Placeholder */}
            <div className="mb-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded flex items-center justify-center mb-4 shadow-md">
                <FileText size={32} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">SURVEYSPHERE</h2>
            </div>

            {/* Join Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 w-full max-w-lg"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Join Survey</h3>
              <p className="text-sm text-slate-500 mb-6">
                Enter your Name and the Survey Code provided by your instructor to proceed.
              </p>

              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Put Your Name"
                    className="w-full px-4 py-3 bg-white border border-indigo-400 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Survey Code</label>
                  <input 
                    type="text" 
                    value={surveyCode}
                    onChange={(e) => setSurveyCode(e.target.value.toUpperCase())}
                    placeholder="e.g., MKT-X7K"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono uppercase tracking-wider"
                    maxLength={10}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors mt-8 shadow-md"
                >
                  Begin Survey <ArrowRight size={18} />
                </button>
              </form>
            </motion.div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JoinSurvey;
