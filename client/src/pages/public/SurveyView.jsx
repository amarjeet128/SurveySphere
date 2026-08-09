import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Check, ArrowRight, ArrowLeft, Clock, ListChecks } from 'lucide-react';

// Mock Survey Data (Restored for Demo CTA)
const demoSurvey = {
  title: "SurveySphere Demo",
  description: "This is a functional demo of the respondent view.",
  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter',
    isLight: true,
    layout: 'centered',
    buttonStyle: 'rounded',
    progressStyle: 'bar',
  },
  landingPage: { showEstimatedTime: true, estimatedTimeText: '1 min', showQuestionCount: true, buttonText: 'Begin Demo' },
  thankYouPage: { title: 'Thank You!', message: 'Demo completed successfully.', showConfetti: true },
  settings: { requireName: false, requireEmail: false },
  questions: [
    { id: '1', type: 'rating', title: 'How would you rate the new UI?', required: true },
    { id: '2', type: 'multiple', title: 'What feature should we build next?', options: ['Excel Import', 'Survey Codes', 'Better Analytics'], required: true }
  ]
};

const SurveyView = () => {
  const { surveyId } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true' || surveyId === 'preview';
  
  const [step, setStep] = useState('landing');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [responses, setResponses] = useState({});
  const [respondentInfo, setRespondentInfo] = useState({ name: '', email: '' });
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (step === 'survey' && !startTime) {
      setStartTime(Date.now());
    }
  }, [step, startTime]);
  
  // Set survey to demo if surveyId is 'demo'
  const [survey, setSurvey] = useState(surveyId === 'demo' ? demoSurvey : null);

  useEffect(() => {
    if (surveyId === 'demo') {
      setSurvey(demoSurvey);
      setCurrentQuestionId(demoSurvey.questions[0].id);
    } else if (surveyId === 'preview') {
      const savedPreview = localStorage.getItem('surveyPreview');
      if (savedPreview) {
        const data = JSON.parse(savedPreview);
        setSurvey(data);
        if (data.questions && data.questions.length > 0) {
          setCurrentPageIndex(0);
        }
      } else {
        setError('Preview data not found. Please click Preview from the Survey Builder again.');
      }
    } else {
      const fetchSurvey = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/code/${surveyId}`);
          if (res.ok) {
            const data = await res.json();
            setSurvey(data);
            if (data.questions && data.questions.length > 0) {
              setCurrentPageIndex(0);
            }
          } else {
            setError('Survey not found or is currently inactive.');
          }
        } catch (err) {
          setError('Failed to connect to the server.');
        }
      };
      fetchSurvey();
    }
  }, [surveyId]);

  // Safe Fallbacks
  const theme = survey?.theme || demoSurvey.theme;
  const landingPage = survey?.landingPage || demoSurvey.landingPage;
  const settings = survey?.settings || demoSurvey.settings || {};
  const thankYouPage = survey?.thankYouPage || demoSurvey.thankYouPage;
  const questions = survey?.questions || [];

  useEffect(() => {
    if (step === 'survey' && settings.timeLimit > 0) {
      if (timeLeft === null) {
        setTimeLeft(settings.timeLimit * 60);
      } else if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else if (timeLeft === 0) {
        handleNext(true); // force submit
      }
    }
  }, [step, settings.timeLimit, timeLeft]);

  if (error) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-500 max-w-md">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors">
          Return Home
        </button>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (survey.status === 'Published' && surveyId !== 'demo') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-500" style={{ backgroundColor: survey.theme?.backgroundColor || '#0f172a', color: '#fff', fontFamily: survey.theme?.fontFamily || 'Inter' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="glass p-12 rounded-[2rem] max-w-lg border border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
            <Clock size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Stay Tuned!</h2>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">This survey is currently scheduled and will start soon. Check back later to submit your responses.</p>
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestions = questions;
  const answeredCount = questions.filter(q => {
    const ans = responses[q.id];
    if (q.type === 'matrix') return ans && q.rows.every(r => ans[r]);
    return ans !== undefined && ans !== '';
  }).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Dynamic Theme Colors
  const isLight = theme.isLight;
  const isDark = !isLight;
  const textMain = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-200';
  const glassClass = isLight ? 'bg-white/80 border border-slate-200 backdrop-blur-md' : 'bg-black/40 border border-white/10 backdrop-blur-md';
  const transparentClass = 'bg-transparent';

  // Theme Helpers
  const getBtnRadius = () => {
    switch(theme.buttonStyle) {
      case 'pill': return 'rounded-full';
      case 'square': return 'rounded-none';
      default: return 'rounded-xl';
    }
  };

  const getAnimationVariants = () => {
    if (theme.animationStyle === 'fade') {
      return { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };
    }
    return { enter: { y: 50, opacity: 0 }, center: { y: 0, opacity: 1 }, exit: { y: -50, opacity: 0 } };
  };

  const slideVariants = getAnimationVariants();

  const handleStartLanding = () => {
    if (settings.requireName || settings.requireEmail) {
      setStep('entry');
    } else {
      setStep('survey');
    }
  };

  const handleStartEntry = (e) => {
    e.preventDefault();
    if (settings.requireName && !respondentInfo.name) return;
    if (settings.requireEmail && !respondentInfo.email) return;
    setStep('survey');
  };

  const handleAnswer = (val, qId, rowIdx = null) => {
    if (rowIdx !== null) {
      const matrixAnswers = responses[qId] || {};
      setResponses({ ...responses, [qId]: { ...matrixAnswers, [rowIdx]: val } });
    } else {
      setResponses({ ...responses, [qId]: val });
    }
  };

  const isAnswered = () => {
    return questions.every(q => {
      if (!q.required) return true;
      const answer = responses[q.id];
      if (q.type === 'matrix') {
        if (!answer) return false;
        return q.rows.every(r => answer[r]);
      }
      return !!answer;
    });
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: [theme.primaryColor, '#ec4899'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: [theme.primaryColor, '#ec4899'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 relative" style={{ 
      backgroundColor: theme.backgroundColor || '#0f172a',
      fontFamily: theme.fontFamily || 'Inter'
    }}>
      {/* Background Image Layer */}
      {theme.backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: `url("${theme.backgroundImage}")` }}
        ></div>
      )}
      
      {/* Gradient Overlay for Readability */}
      <div className={`absolute inset-0 w-full h-full ${theme.isLight ? 'bg-white/30' : 'bg-black/50'}`}></div>

      {/* Content Container */}
      <div className="relative z-10 flex-1 flex flex-col w-full">
      
      {/* Progress Indicator & Timer */}
      {step === 'survey' && (
        <div className="fixed top-0 right-0 h-full flex flex-col items-center justify-center p-6 z-50 pointer-events-none gap-6">
          {(!theme.progressStyle || theme.progressStyle === 'bar') && (
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              <div className="text-xl font-bold tracking-tight drop-shadow-md" style={{ color: theme.primaryColor || (isLight ? '#333' : '#fff'), fontFamily: 'Outfit, Inter, sans-serif' }}>{Math.round(progress)}%</div>
              <div className="w-2 h-64 bg-white/20 rounded-full overflow-hidden relative shadow-inner">
                <motion.div className="absolute bottom-0 w-full rounded-full" style={{ backgroundColor: theme.primaryColor }} initial={{ height: 0 }} animate={{ height: `${progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
            </div>
          )}

          {theme.progressStyle === 'stacks' && (
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
              <div className="text-xl font-bold tracking-tight drop-shadow-md" style={{ color: theme.primaryColor || (isLight ? '#333' : '#fff'), fontFamily: 'Outfit, Inter, sans-serif' }}>{Math.round(progress)}%</div>
              <div className="flex flex-col-reverse gap-1.5">
                {[...Array(10)].map((_, i) => {
                  const isActive = progress >= (i + 1) * 10 || (progress > 0 && i === 0);
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0.8, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      transition={{ delay: i * 0.05 }}
                      className={`w-8 h-4 rounded-sm shadow-sm transition-all duration-500`} 
                      style={{ backgroundColor: isActive ? (theme.primaryColor || '#6366f1') : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)') }} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          {theme.progressStyle === 'cartoon' && (
            <div className="flex flex-col items-center pointer-events-auto relative h-72 w-16 bg-white/10 backdrop-blur-sm rounded-full shadow-inner overflow-hidden border border-white/20">
              <div className="absolute w-full flex flex-col items-center justify-end transition-all duration-700 ease-out z-20" style={{ bottom: `${progress}%`, transform: 'translateY(50%)' }}>
                 <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl filter drop-shadow-lg mb-2">🚀</motion.div>
              </div>
              <motion.div className="absolute bottom-0 w-full rounded-full opacity-60" style={{ backgroundColor: theme.primaryColor || '#6366f1' }} initial={{ height: 0 }} animate={{ height: `${progress}%` }} transition={{ duration: 0.7, type: 'spring' }} />
              <div className="absolute top-4 text-sm font-black text-white drop-shadow-md z-30" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>{Math.round(progress)}%</div>
            </div>
          )}

          {theme.progressStyle === 'circle' && (
            <div className="flex items-center justify-center pointer-events-auto relative w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full shadow-sm border border-white/20 p-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className={`${isLight ? 'text-black/10' : 'text-white/20'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <motion.path 
                  className="transition-all duration-700 ease-out"
                  style={{ color: theme.primaryColor || '#6366f1' }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeDasharray={`${progress}, 100`}
                />
              </svg>
              <div className="absolute text-sm font-bold drop-shadow-sm" style={{ color: theme.primaryColor || (isLight ? '#333' : '#fff'), fontFamily: 'Outfit, Inter, sans-serif' }}>{Math.round(progress)}%</div>
            </div>
          )}
          
          {settings.timeLimit > 0 && timeLeft !== null && (
            <div className="p-4 pointer-events-auto">
              <div className={`px-4 py-2 rounded-lg font-mono font-bold border shadow-lg flex items-center gap-2 transition-colors ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : isDark ? 'bg-black/40 text-slate-200 border-white/10' : 'bg-white/80 text-slate-800 border-slate-200'}`}>
                <Clock size={16} />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">

          {/* Landing Page */}
          {step === 'landing' && (
            <motion.div key="landing" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5 }} className={`p-12 ${theme.layout === 'split' ? 'grid md:grid-cols-2 gap-12 items-center' : 'text-center'} drop-shadow-md`}>
              
              {theme.layout === 'split' && theme.logoUrl && (
                <div className="hidden md:flex justify-center items-center">
                  <img src={theme.logoUrl} alt="Logo" className="w-64 h-64 object-cover rounded-[2rem] shadow-2xl" />
                </div>
              )}

              <div className={`${theme.layout === 'centered' ? 'flex flex-col items-center' : ''}`}>
                {theme.layout === 'centered' && theme.logoUrl && (
                  <img src={theme.logoUrl} alt="Logo" className="w-32 h-32 object-cover rounded-3xl shadow-xl mb-8" />
                )}
                
                <h1 className={`text-5xl font-bold ${textMain} mb-6 leading-tight`}>{survey.title}</h1>
                <p className={`${textMuted} text-lg mb-10 leading-relaxed`}>{survey.description}</p>
                
                <div className={`flex flex-wrap gap-6 mb-10 ${theme.layout === 'centered' ? 'justify-center' : ''}`}>
                  {landingPage.showEstimatedTime && (
                    <div className={`flex items-center gap-2 ${isDark ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-white/60 text-slate-700 border-white/10'} px-4 py-2 rounded-lg border`}>
                      <Clock size={18} style={{ color: theme.primaryColor }} />
                      <span className="font-medium">{landingPage.estimatedTimeText}</span>
                    </div>
                  )}
                  {landingPage.showQuestionCount && (
                    <div className={`flex items-center gap-2 ${isDark ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-white/60 text-slate-700 border-white/10'} px-4 py-2 rounded-lg border`}>
                      <ListChecks size={18} style={{ color: theme.primaryColor }} />
                      <span className="font-medium">{questions.length} Questions</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleStartLanding}
                  style={{ backgroundColor: theme.primaryColor }}
                  className={`text-slate-900 px-10 py-4 text-xl font-medium shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center gap-3 ${theme.layout === 'centered' ? 'mx-auto' : ''} ${getBtnRadius()}`}
                >
                  {landingPage.buttonText} <ArrowRight size={22} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Entry Gate (Name/Email) */}
          {step === 'entry' && (
            <motion.div key="entry" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5 }} className={`p-12 max-w-xl mx-auto w-full drop-shadow-md`}>
              <h2 className={`text-3xl font-bold ${textMain} mb-8`}>Before we begin...</h2>
              <form onSubmit={handleStartEntry} className="space-y-6">
                {settings.requireName && (
                  <div>
                    <label className={`block ${textMuted} mb-2 font-medium`}>Your Name</label>
                    <input type="text" required autoFocus className={`w-full ${isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-slate-400' : 'bg-white/60 border-slate-200 text-slate-900'} rounded-xl px-4 py-4 outline-none focus:border-indigo-500 transition-colors text-lg`} placeholder="Jane Doe" value={respondentInfo.name} onChange={e => setRespondentInfo({...respondentInfo, name: e.target.value})} />
                  </div>
                )}
                {settings.requireEmail && (
                  <div>
                    <label className={`block ${textMuted} mb-2 font-medium`}>Email Address</label>
                    <input type="email" required className={`w-full ${isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-slate-400' : 'bg-white/60 border-slate-200 text-slate-900'} rounded-xl px-4 py-4 outline-none focus:border-indigo-500 transition-colors text-lg`} placeholder="jane@example.com" value={respondentInfo.email} onChange={e => setRespondentInfo({...respondentInfo, email: e.target.value})} />
                  </div>
                )}
                <button type="submit" style={{ backgroundColor: theme.primaryColor }} className={`mt-8 w-full flex justify-center items-center gap-2 text-slate-900 px-8 py-4 text-lg font-medium transition-transform active:scale-95 shadow-lg ${getBtnRadius()}`}>
                  Continue <ArrowRight size={20} />
                </button>
              </form>
            </motion.div>
          )}

          {/* Survey Questions */}
          {step === 'survey' && currentQuestions.length > 0 && (
            <motion.div key={currentPageIndex} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="w-full max-w-3xl mx-auto space-y-12">
              {currentQuestions.map((q, idx) => {
                const globalIndex = idx + 1;
                return (
                  <div key={q.id} className="p-4 md:py-2 mb-2">
                    <div className="mb-5">
                      <h2 className={`text-lg md:text-xl ${textMain} leading-relaxed font-normal`}>
                        {globalIndex}. {q.questionText || q.title}
                        {q.required && <span className="text-red-500 ml-1 font-medium">*</span>}
                      </h2>
                    </div>

                    <div className="pl-6 mb-4">
                      {q.type === 'text' && (
                        <input
                          type="text"
                          value={responses[q.id] || ''}
                          onChange={(e) => handleAnswer(e.target.value, q.id)}
                          placeholder="Type your answer here..."
                          className={`w-full text-base bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none py-2 transition-colors ${!isLight ? 'border-white/20 text-white placeholder:text-white/40 drop-shadow-sm' : 'border-slate-300 text-slate-900 placeholder:text-slate-500'}`}
                        />
                      )}

                      {q.type === 'longtext' && (
                        <textarea
                          value={responses[q.id] || ''}
                          onChange={(e) => handleAnswer(e.target.value, q.id)}
                          placeholder="Type your answer here..."
                          className={`w-full text-base bg-transparent border-2 rounded-xl p-4 min-h-[120px] outline-none focus:border-indigo-500 transition-colors ${isDark ? 'border-white/30 text-white placeholder:text-white/20 focus:bg-white/5' : 'border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'}`}
                        />
                      )}

                      {q.type === 'multiple' && (
                        <div className="grid md:grid-cols-2 gap-y-3 gap-x-6 mt-4">
                          {q.options.map((opt) => {
                            const isSelected = responses[q.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleAnswer(opt, q.id)}
                                className="text-left transition-all flex items-center gap-3 w-full group"
                              >
                                <div className="w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all shadow-sm" 
                                     style={isSelected 
                                      ? { borderColor: isLight ? theme.primaryColor : 'white', backgroundColor: isLight ? theme.primaryColor : 'white' } 
                                      : { borderColor: isLight ? '#94a3b8' : 'rgba(255,255,255,0.7)' }}>
                                  {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isLight ? 'white' : (theme.primaryColor || '#000') }}></div>}
                                </div>
                                <span className={`text-base drop-shadow-sm font-normal transition-colors ${isSelected ? textMain : textMuted} group-hover:opacity-80`}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'matrix' && (
                        <div className={`overflow-x-auto rounded-xl p-2`}>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className={`p-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}></th>
                                {q.columns.map(col => <th key={col} className={`p-3 ${textMuted} border-b ${isDark ? 'border-white/10' : 'border-slate-200'} text-center font-medium text-sm`}>{col}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {q.rows.map(row => (
                                <tr key={row} className={`border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-300/30 hover:bg-white/40'} last:border-0 transition-colors`}>
                                  <td className={`p-3 ${textMain} font-medium text-base`}>{row}</td>
                                  {q.columns.map(col => (
                                    <td key={col} className="p-3 text-center">
                                      <input type="radio" name={`${q.id}-${row}`} className="w-5 h-5 cursor-pointer" style={{ accentColor: theme.primaryColor }} checked={responses[q.id]?.[row] === col} onChange={() => handleAnswer(col, q.id, row)} />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {q.type === 'rating' && (
                        <div className="flex flex-wrap gap-3">
                          {[1, 2, 3, 4, 5].map(num => {
                             const isSelected = responses[q.id] === num;
                             return (
                              <button
                                key={num}
                                onClick={() => handleAnswer(num, q.id)}
                                className={`w-14 h-14 text-xl font-medium transition-all ${getBtnRadius()} ${isSelected ? 'text-slate-900 scale-105 shadow-md' : `${isDark ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-white/60 text-slate-400 border border-slate-300 hover:bg-slate-100'}`}`}
                                style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                              >{num}</button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-end gap-6 pt-6 pb-20">
                <button 
                  onClick={() => {
                    const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
                    const formattedAnswers = Object.keys(responses).map(key => ({
                      questionId: key,
                      answer: responses[key]
                    }));
                    if (surveyId !== 'demo' && survey && !isPreview) {
                      fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/responses/${survey._id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          respondentName: respondentInfo.name,
                          respondentEmail: respondentInfo.email,
                          answers: formattedAnswers,
                          timeTaken
                        })
                      }).catch(err => console.error(err));
                    }
                    if (thankYouPage.showConfetti) triggerConfetti();
                    setStep('success');
                  }}
                  disabled={!isAnswered()}
                  className={`flex items-center gap-2 text-white px-8 py-3 text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 ${getBtnRadius()}`}
                  style={{ backgroundColor: theme.primaryColor || '#6366f1' }}
                >
                  Submit <Check size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Success Screen */}
          {step === 'success' && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, type: "spring" }} className={`text-center ${glassClass} p-16 rounded-[3rem]`}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl" style={{ backgroundColor: theme.primaryColor }}>
                <Check size={48} className="text-slate-900" />
              </div>
              <h2 className={`text-5xl font-bold ${textMain} mb-6 leading-tight`}>{thankYouPage.title}</h2>
              <p className={`text-2xl ${textMuted} mb-10 leading-relaxed`}>{thankYouPage.message}</p>
              <button onClick={() => window.location.reload()} className="font-medium text-lg hover:underline transition-all" style={{ color: theme.primaryColor }}>Take survey again</button>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>
      


      </div> {/* End Content Container */}
    </div>
  );
};

export default SurveyView;
