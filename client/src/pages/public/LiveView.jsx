import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Radio, GripVertical } from 'lucide-react';

const socket = io(import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com');

// ─── Per-Type Participant Input Components ──────────────────────────────────

const MultipleChoiceInput = ({ options, onSubmit }) => (
  <div className="space-y-4 w-full">
    {options.map((opt, i) => (
      <motion.button
        key={opt}
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
        onClick={() => onSubmit(opt)}
        className="w-full text-left px-6 py-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md text-xl font-medium text-slate-800 transition-all active:scale-95 flex items-center gap-4 group"
      >
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center group-hover:border-indigo-400 text-sm text-slate-400 group-hover:text-indigo-600 font-bold shrink-0">
          {String.fromCharCode(65 + i)}
        </div>
        {opt}
      </motion.button>
    ))}
  </div>
);

const WordCloudInput = ({ onSubmit }) => {
  const [val, setVal] = React.useState('');
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <form onSubmit={e => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }} className="flex flex-col gap-4">
        <input
          autoFocus type="text" value={val} onChange={e => setVal(e.target.value)}
          placeholder="Type your answer..."
          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-800 text-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-center"
        />
        <button type="submit" disabled={!val.trim()} className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 text-lg">
          Submit
        </button>
      </form>
    </motion.div>
  );
};

const ScalesInput = ({ options, onSubmit }) => {
  const [ratings, setRatings] = React.useState(() => Object.fromEntries(options.map(o => [o, 3])));
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
      {options.map((opt) => (
        <div key={opt} className="w-full">
          <p className="text-slate-700 font-medium text-lg mb-3 text-center">{opt}</p>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRatings(r => ({ ...r, [opt]: n }))}
                className={`flex-1 h-14 rounded-xl font-bold text-xl transition-all ${
                  ratings[opt] === n ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >{n}</button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
            <span>Strongly Disagree</span><span>Strongly Agree</span>
          </div>
        </div>
      ))}
      <button onClick={() => onSubmit(JSON.stringify(ratings))} className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-all text-lg mt-4">
        Submit Ratings
      </button>
    </motion.div>
  );
};

const RankingInput = ({ options, onSubmit }) => {
  const [selected, setSelected] = React.useState([]);

  const toggleSelection = (opt) => {
    if (selected.includes(opt)) {
      setSelected(selected.filter(item => item !== opt));
    } else {
      setSelected([...selected, opt]);
    }
  };

  const handleSubmit = () => {
    // Any unselected options are appended to the bottom of the ranking automatically
    const unselected = options.filter(opt => !selected.includes(opt));
    const finalOrder = [...selected, ...unselected];
    onSubmit(JSON.stringify({ order: finalOrder }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-3">
      <p className="text-center text-slate-500 text-sm mb-4">Select the options in your preferred order (1st, 2nd, etc.)</p>
      {options.map((opt) => {
        const rank = selected.indexOf(opt) + 1;
        const isSelected = rank > 0;
        
        return (
          <button 
            key={opt}
            onClick={() => toggleSelection(opt)}
            className={`w-full text-left px-6 py-5 rounded-2xl border transition-all active:scale-95 flex items-center gap-4 group
              ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
          >
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors
              ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-600'}`}>
              {isSelected ? rank : ''}
            </div>
            <span className={`font-medium text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
              {opt}
            </span>
          </button>
        );
      })}
      <button 
        onClick={handleSubmit} 
        className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-all text-lg mt-4 shadow-md shadow-indigo-600/20"
      >
        Submit Ranking
      </button>
    </motion.div>
  );
};

const QandAInput = ({ onSubmit }) => {
  const [val, setVal] = React.useState('');
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <form onSubmit={e => { e.preventDefault(); if (val.trim()) onSubmit(val.trim()); }} className="flex flex-col gap-4">
        <textarea autoFocus value={val} onChange={e => setVal(e.target.value)}
          placeholder="Type your question or comment..." rows={4}
          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-800 text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
        />
        <button type="submit" disabled={!val.trim()} className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 text-lg">
          Submit
        </button>
      </form>
    </motion.div>
  );
};

// ─── Main LiveView Component ─────────────────────────────────────────────────

const LiveView = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code');

  const [liveState, setLiveState] = useState({
    isActive: false,
    isEnded: false,
    question: null,
    votes: {}
  });
  const [participantName, setParticipantName] = useState(() => sessionStorage.getItem('live_name') || '');
  const [hasJoined, setHasJoined] = useState(() => sessionStorage.getItem('live_joined') === 'true');
  const [nameInput, setNameInput] = useState(() => sessionStorage.getItem('live_name') || '');
  const [votedQuestionTitle, setVotedQuestionTitle] = useState(() => sessionStorage.getItem('live_voted_title') || null);
  
  const hasVoted = liveState.question?.title && liveState.question.title === votedQuestionTitle;

  useEffect(() => {
    socket.on('live-state-update', (state) => {
      setLiveState(state);
    });
    
    const handleConnect = () => {
      if (code) {
        socket.emit('join-poll-room', code);
        socket.emit('request-live-state', code);
      }
      
      const savedName = sessionStorage.getItem('live_name');
      const savedJoined = sessionStorage.getItem('live_joined') === 'true';
      if (savedJoined && savedName && code) {
        socket.emit('participant-joined', { code, name: savedName });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('live-state-update');
    };
  }, []);

  useEffect(() => {
    if (liveState.isEnded) {
      // Clear all session data so they see the thank you screen
      sessionStorage.removeItem('live_voted_title');
      setVotedQuestionTitle(null);
    } else if (liveState.isActive === false) {
      // Poll stopped but not ended — reset vote state so they can vote again on new question
      setVotedQuestionTitle(null);
      sessionStorage.removeItem('live_voted_title');
    }
  }, [liveState.isActive, liveState.isEnded]);

  // Reset vote when host moves to a different question
  useEffect(() => {
    const storedTitle = sessionStorage.getItem('live_voted_title');
    if (liveState.question?.title && storedTitle !== liveState.question.title) {
      setVotedQuestionTitle(null);
      // Note: intentionally do NOT remove from storage here — we only clear if title differs
    }
  }, [liveState.question?.title]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      const name = nameInput.trim();
      setParticipantName(name);
      setHasJoined(true);
      sessionStorage.setItem('live_name', name);
      sessionStorage.setItem('live_joined', 'true');
      if (code) {
        socket.emit('participant-joined', { code, name });
      }
    }
  };

  const handleVote = (answer) => {
    if (!hasVoted && liveState.isActive && code) {
      socket.emit('submit-vote', { code, answer });
      setVotedQuestionTitle(liveState.question.title);
      sessionStorage.setItem('live_voted_title', liveState.question.title);
    }
  };

  const renderQuestionInput = () => {
    const type = liveState.question?.type;
    const options = liveState.question?.options || [];
    switch (type) {
      case 'word_cloud':
      case 'open_text':
        return <WordCloudInput onSubmit={handleVote} />;
      case 'scales':
        return <ScalesInput options={options} onSubmit={handleVote} />;
      case 'ranking':
        return <RankingInput options={options} onSubmit={handleVote} />;
      case 'q_and_a':
        return <QandAInput onSubmit={handleVote} />;
      case 'multiple_choice':
      default:
        return <MultipleChoiceInput options={options} onSubmit={handleVote} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans px-6">
      <AnimatePresence mode="wait">
        {!hasJoined ? (
          <motion.div 
            key="join"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
               <Radio size={32} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Join Live Poll</h1>
            <p className="text-slate-500 mb-8">Please enter your name to join the presentation.</p>
            
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Your Name" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-center text-lg"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-600/20"
              >
                Join Presentation
              </button>
            </form>
          </motion.div>
        ) : liveState.isEnded ? (
          <motion.div 
            key="ended"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 rounded-full bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Thank you for participating!</h1>
            <p className="text-slate-500 text-lg">The poll has ended. You may now close this window.</p>
          </motion.div>
        ) : !liveState.isActive ? (
          <motion.div 
            key="waiting"
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
        ) : (
          <motion.div 
            key={liveState.question?.title || 'voting'}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl"
          >
            <div className="mb-4 inline-block bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-indigo-700 font-semibold text-sm">
              {liveState.question?.pollName || 'Live Poll'}
            </div>
            <h2 
              className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 leading-tight rich-text"
              dangerouslySetInnerHTML={{ __html: liveState.question?.title || '' }}
            />

            {!hasVoted ? renderQuestionInput() : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-12 rounded-3xl text-center border border-slate-100 shadow-sm"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Answer Recorded!</h3>
                <p className="text-slate-400">Look at the presenter's screen for real-time results.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveView;
