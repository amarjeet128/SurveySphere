import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Settings, Share2, Plus, Play, 
  BarChart2, PieChart, LayoutGrid, LayoutTemplate, 
  MessageSquare, Paintbrush, MonitorPlay, HelpCircle, 
  X, ChevronDown, Check, GripVertical, Settings2, Image as ImageIcon, Trash2,
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, MoreHorizontal,
  Sliders, ListOrdered, MessagesSquare, TrendingUp, Grid, MapPin, ListChecks,
  ChevronLeft, ChevronRight, Minus, Users, CheckSquare, QrCode
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import ContentEditableModule from 'react-contenteditable';

const ContentEditable = ContentEditableModule.default || ContentEditableModule;

const socket = io(import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com');

const COLORS = ['#6366f1', '#f43f5e', '#1e3a8a', '#10b981', '#f59e0b', '#8b5cf6'];

const LivePanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReadonly = searchParams.get('readonly') === 'true';
  const [activeTab, setActiveTab] = useState(isReadonly ? 'Results' : 'Create');
  const [pollName, setPollName] = useState('Untitled');
  const [surveyCode, setSurveyCode] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Refactored state: Array of slides
  const [slides, setSlides] = useState([
    {
      id: 1,
      questionType: 'multiple_choice',
      chartType: 'donut',
      questionTitle: 'What should we prioritize going forward?',
      options: [
        { id: 1, name: 'Option 1', value: 0, color: '#6366f1' },
        { id: 2, name: 'Option 2', value: 0, color: '#f43f5e' },
        { id: 3, name: 'Option 3', value: 0, color: '#1e3a8a' },
      ]
    }
  ]);
  const [activeSlideId, setActiveSlideId] = useState(1);
  const activeSlide = slides.find(s => s.id === activeSlideId) || slides[0];
  const [isEditingTitleOnCanvas, setIsEditingTitleOnCanvas] = useState(false);
  const [previewChartType, setPreviewChartType] = useState(null);
  const [isQuestionTypeMenuOpen, setIsQuestionTypeMenuOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Track which slide was last synced to participants to avoid feedback loops
  const lastEmittedSlideRef = useRef(null);

  // Formatting menus
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  
  const fontFamilies = [
    { name: 'Default', value: 'Inter' },
    { name: 'Serif', value: 'Georgia' },
    { name: 'Mono', value: 'Courier New' },
    { name: 'Comic', value: 'Comic Sans MS' },
    { name: 'Impact', value: 'Impact' }
  ];
  const textColors = ['#0f172a', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

  // Preview Mode State
  const [previewVotes, setPreviewVotes] = useState({});
  const [mobileAnswers, setMobileAnswers] = useState({});
  const [mobileSubmitted, setMobileSubmitted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [responsesCount, setResponsesCount] = useState(0);
  const [activeAnimations, setActiveAnimations] = useState([]);

  const triggerVoteAnimation = (answer) => {
    if (!activeSlide || activeSlide.chartType !== 'dots') return;
    
    const option = activeSlide.options.find(opt => opt.name === answer);
    if (!option) return;

    const dotStackElement = document.getElementById(`dot-stack-base-${option.id}`);
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    if (dotStackElement) {
      const rect = dotStackElement.getBoundingClientRect();
      targetX = rect.left + (rect.width / 2) - 16;
      targetY = rect.bottom - 32;
    }

    const startEdges = [
      { x: -50, y: Math.random() * window.innerHeight },
      { x: window.innerWidth + 50, y: Math.random() * window.innerHeight },
      { x: Math.random() * window.innerWidth, y: -50 },
      { x: Math.random() * window.innerWidth, y: window.innerHeight + 50 }
    ];
    const startPoint = startEdges[Math.floor(Math.random() * startEdges.length)];
    const animationId = Date.now() + Math.random();

    setActiveAnimations(prev => [...prev, {
      id: animationId,
      color: option.color,
      startX: startPoint.x,
      startY: startPoint.y,
      targetX,
      targetY
    }]);

    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(anim => anim.id !== animationId));
    }, 800);
  };

  useEffect(() => {
    if (!id) return;
    const fetchPoll = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPollName(data.title);
          setSurveyCode(data.surveyCode);
          if (data.questions && data.questions.length > 0) {
            const savedVotes = (data.status === 'Ended' && data.liveResults) ? data.liveResults.votes || {} : {};
            
            const mappedSlides = data.questions.map((q, idx) => {
              const slideId = q.id || idx + 1;
              const qType = q.type || 'multiple_choice';
              const slideVotes = savedVotes[slideId] || {};
              
              return {
                id: slideId,
                questionType: qType,
                chartType: q.chartType || 'bar',
                questionTitle: q.title || 'Untitled Slide',
                options: (q.options || []).map((optName, i) => {
                  let val = 0;
                  const rawVote = slideVotes[optName];
                  if (qType === 'scales' && rawVote) {
                    val = rawVote.count > 0 ? Number((rawVote.sum / rawVote.count).toFixed(1)) : 0;
                  } else if (rawVote) {
                    val = rawVote;
                  }
                  return {
                    id: i + 1,
                    name: optName,
                    value: val,
                    color: COLORS[i % COLORS.length]
                  };
                }),
                allowMultiple: q.allowMultiple || false,
                showPercentage: q.showPercentage || false
              };
            });
            setSlides(mappedSlides);
            setActiveSlideId(mappedSlides[0].id);
            
            // Also populate previewVotes for the split-screen view
            if (data.status === 'Ended' && data.liveResults && data.liveResults.votes) {
                const allPreviewVotes = {};
                mappedSlides.forEach(slide => {
                    const slideVotesObj = {};
                    slide.options.forEach(opt => {
                        slideVotesObj[opt.id] = opt.value;
                    });
                    allPreviewVotes[slide.id] = slideVotesObj;
                });
                setPreviewVotes(allPreviewVotes);
            }
          }
          if (data.status === 'Ended') {
            setIsEnded(true);
            setActiveTab('Results');
            if (data.liveResults && data.liveResults.participants) {
              setParticipants(data.liveResults.participants);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load poll', err);
      }
    };
    fetchPoll();
  }, [id]);

  useEffect(() => {
    const handleConnect = () => {
      if (surveyCode) {
        socket.emit('join-poll-room', surveyCode);
      }
    };
    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }
    return () => socket.off('connect', handleConnect);
  }, [surveyCode]);

  useEffect(() => {
    if (location.search.includes('start=true') && !isLive && slides.length > 0 && surveyCode) {
      const currentSlide = slides.find(s => s.id === activeSlideId) || slides[0];
      socket.emit('admin-start-poll', {
        code: surveyCode,
        question: {
          pollId: id,
          id: currentSlide.id,
          pollName,
          title: currentSlide.questionTitle,
          options: (currentSlide.options || []).map(o => o.name),
          type: currentSlide.questionType,
          chartType: currentSlide.chartType,
          allowMultiple: currentSlide.allowMultiple || false
        }
      });
      setIsLive(true);
      navigate(`/admin/live/builder/${id}`, { replace: true });
    }
  }, [location.search, isLive, slides, activeSlideId, id, navigate, pollName, surveyCode]);

  useEffect(() => {
    const handleLiveStateUpdate = (state) => {
      if (state.participants) {
        setParticipants(state.participants);
      }
      if (state.responsesCount !== undefined) {
        setResponsesCount(state.responsesCount);
      }
      if (state.isEnded) {
        setIsEnded(true);
        setIsLive(false);
        setActiveTab('Results');
      } else if (state.isActive) {
        setIsLive(true);
        setIsEnded(false);
      }
      if (state.isActive && activeSlide && state.question.title === activeSlide.questionTitle) {
        const newPreviewVotes = { ...previewVotes };
        const slideVotes = {};
        
        setSlides(prevSlides => prevSlides.map(slide => {
          if (slide.id === activeSlideId) {
            const rawSlideVotes = state.votes[slide.id] || {};
            return {
              ...slide,
              options: slide.options.map(opt => {
                let val = 0;
                const rawVote = rawSlideVotes[opt.name];
                
                if (slide.questionType === 'scales' && rawVote) {
                  val = rawVote.count > 0 ? Number((rawVote.sum / rawVote.count).toFixed(1)) : 0;
                } else if (rawVote) {
                  val = rawVote;
                }
                
                slideVotes[opt.id] = val;
                return {
                  ...opt,
                  value: val
                };
              })
            };
          }
          return slide;
        }));
        
        newPreviewVotes[activeSlideId] = slideVotes;
        setPreviewVotes(newPreviewVotes);
      }
    };
    
    const handleVoteAnimation = ({ answer, type }) => {
      triggerVoteAnimation(answer);
    };

    socket.on('live-state-update', handleLiveStateUpdate);
    socket.on('vote-animation', handleVoteAnimation);
    return () => {
      socket.off('live-state-update', handleLiveStateUpdate);
      socket.off('vote-animation', handleVoteAnimation);
    };
  }, [isLive, activeSlideId, activeSlide]);

  useEffect(() => {
    if (!isLive) return;
    // Only emit when the admin actually navigates to a new slide (not on vote updates)
    if (lastEmittedSlideRef.current === activeSlideId) return;
    lastEmittedSlideRef.current = activeSlideId;
    
    // Read slide FRESH from array to avoid stale closure bug
    const currentSlide = slides.find(s => s.id === activeSlideId);
    if (currentSlide) {
      socket.emit('admin-slide-changed', {
        code: surveyCode,
        question: {
          pollId: id,
          pollName,
        title: currentSlide.questionTitle,
        options: (currentSlide.options || []).map(o => o.name),
        type: currentSlide.questionType,
        chartType: currentSlide.chartType,
        allowMultiple: currentSlide.allowMultiple || false
        }
      });
    }
  }, [activeSlideId, slides, isLive, surveyCode]); // slides kept so we have fresh data on first run

  const savePoll = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const questionsToSave = slides.map(slide => ({
        id: slide.id.toString(),
        type: slide.questionType,
        chartType: slide.chartType,
        title: slide.questionTitle,
        options: slide.options.map(opt => opt.name),
        required: false,
        allowMultiple: slide.allowMultiple || false,
        showPercentage: slide.showPercentage || false
      }));

      await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: pollName,
          questions: questionsToSave
        })
      });
      // Could show a toast here
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setIsSaving(false);
    }
  };

  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [activeSlideId, isPreviewMode]);

  useEffect(() => {
    setMobileAnswers({});
    setMobileSubmitted(false);
  }, [activeSlideId, isPreviewMode]);

  const handleMobileSubmit = (type) => {
    const currentVotes = previewVotes[activeSlideId] || {};
    const newVotes = { ...currentVotes };
    
    if (type === 'multiple_choice') {
      Object.keys(mobileAnswers).forEach(selectedId => {
        if (mobileAnswers[selectedId]) {
          newVotes[selectedId] = (newVotes[selectedId] || 0) + 1;
          const option = activeSlide.options.find(opt => opt.id === Number(selectedId));
          if (option) {
            triggerVoteAnimation(option.name);
          }
        }
      });
    } else if (type === 'scales') {
      activeSlide.options.forEach(opt => {
        const val = mobileAnswers[opt.id] || 3;
        if (!newVotes[opt.id]) newVotes[opt.id] = { sum: 0, count: 0 };
        newVotes[opt.id].sum += val;
        newVotes[opt.id].count += 1;
      });
    } else if (type === 'ranking') {
      const order = Array.isArray(mobileAnswers.order) ? mobileAnswers.order : [];
      activeSlide.options.forEach(opt => {
        const rankIndex = order.indexOf(opt.id);
        const val = rankIndex !== -1 ? activeSlide.options.length - rankIndex : 0;
        newVotes[opt.id] = (newVotes[opt.id] || 0) + val;
      });
    }
    
    setPreviewVotes({ ...previewVotes, [activeSlideId]: newVotes });
    setMobileSubmitted(true);
  };

  const handleFormat = (command, value = null) => {
    const selection = window.getSelection();
    if ((command === 'fontName' || command === 'foreColor') && selection.isCollapsed) {
      document.execCommand('selectAll', false, null);
    }
    document.execCommand(command, false, value);
    // Force blur and refocus to ensure cursor state updates visually if needed, though execCommand usually handles it
  };

  const userInfo = JSON.parse(localStorage.getItem('userInfo')) || { name: 'Admin User' };
  const adminInitial = userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'A';
  

  const updateActiveSlide = (updates) => {
    setSlides(slides.map(slide => slide.id === activeSlideId ? { ...slide, ...updates } : slide));
  };

  const handleNewSlide = () => {
    const newId = slides.length ? Math.max(...slides.map(s => s.id)) + 1 : 1;
    const newSlide = {
      id: newId,
      questionType: 'multiple_choice',
      chartType: 'bar',
      questionTitle: '',
      options: [
        { id: 1, name: 'Option 1', value: 0, color: '#6366f1' },
        { id: 2, name: 'Option 2', value: 0, color: '#f43f5e' },
      ]
    };
    setSlides([...slides, newSlide]);
    setActiveSlideId(newId);
  };
  const handleStartPresentation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (isLive) {
        await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ status: 'Ended' })
        });
        socket.emit('admin-stop-poll', surveyCode);
        setIsLive(false);
        setIsEnded(true);
        setActiveTab('Results');
      } else {
        await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ status: 'Active' })
        });
        setIsEnded(false);
        const currentSlide = slides.find(s => s.id === activeSlideId) || slides[0];
        socket.emit('admin-start-poll', {
          code: surveyCode,
          question: {
            pollId: id,
            id: currentSlide.id,
            pollName,
            title: currentSlide.questionTitle,
            options: (currentSlide.options || []).map(o => o.name),
            type: currentSlide.questionType,
            chartType: currentSlide.chartType,
            allowMultiple: currentSlide.allowMultiple || false
          }
        });
        setIsLive(true);
      }
    } catch (err) {
      console.error('Failed to update poll status', err);
    }
  };

  const handleAddOption = () => {
    const newOptionId = activeSlide.options.length ? Math.max(...activeSlide.options.map(o => o.id)) + 1 : 1;
    updateActiveSlide({
      options: [...activeSlide.options, { 
        id: newOptionId, 
        name: `Option ${newOptionId}`, 
        value: 0, 
        color: COLORS[activeSlide.options.length % COLORS.length] 
      }]
    });
  };

  const handleOptionChange = (id, newName) => {
    updateActiveSlide({
      options: activeSlide.options.map(opt => opt.id === id ? { ...opt, name: newName } : opt)
    });
  };

  const handleDeleteOption = (id) => {
    if (activeSlide.options.length > 2) {
      updateActiveSlide({
        options: activeSlide.options.filter(opt => opt.id !== id)
      });
    }
  };


  const QUESTION_TYPES = [
    { group: 'Interactive questions', items: [
      { id: 'multiple_choice', name: 'Multiple Choice', icon: BarChart2, color: 'text-indigo-600' },
      { id: 'open_ended', name: 'Open Ended', icon: MessageSquare, color: 'text-rose-400' },
      { id: 'scales', name: 'Scales', icon: Sliders, color: 'text-blue-500' },
      { id: 'ranking', name: 'Ranking', icon: ListOrdered, color: 'text-emerald-500' },
      { id: 'qa', name: 'Q&A', icon: MessagesSquare, color: 'text-rose-400' },
      { id: 'guess_number', name: 'Guess the Number', icon: HelpCircle, color: 'text-amber-500' },
      { id: '100_points', name: '100 Points', icon: TrendingUp, color: 'text-blue-600' },
      { id: '2x2_grid', name: '2 x 2 Grid', icon: Grid, color: 'text-red-400' },
      { id: 'pin_image', name: 'Pin on Image', icon: MapPin, color: 'text-indigo-500' },
    ]},
    { group: 'Quiz competitions', items: [
      { id: 'select_answer', name: 'Select Answer', icon: ListChecks, color: 'text-indigo-600' },
    ]}
  ];

  const getActiveQuestionType = () => {
    for (const group of QUESTION_TYPES) {
      const found = group.items.find(i => i.id === activeSlide.questionType);
      if (found) return found;
    }
    return QUESTION_TYPES[0].items[0];
  };

  const activeQuestionTypeObj = getActiveQuestionType();
  const ActiveQuestionIcon = activeQuestionTypeObj.icon;

  const currentSlideIndex = slides.findIndex(s => s.id === activeSlideId);
  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setActiveSlideId(slides[currentSlideIndex + 1].id);
    }
  };
  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setActiveSlideId(slides[currentSlideIndex - 1].id);
    }
  };

  return (
    <div className="h-screen w-full bg-[#f5f5f5] flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-auto min-h-[56px] py-2 md:py-0 md:h-14 bg-white border-b border-gray-200 flex flex-wrap md:flex-nowrap items-center justify-between px-2 md:px-4 shrink-0 shadow-sm z-10 gap-y-2 md:gap-y-0">
        {/* Left: Title & Actions */}
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-1/3 order-1">
          <Link to="/admin/live" className="p-1 md:p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <input 
              type="text"
              value={pollName}
              onChange={(e) => setPollName(e.target.value)}
              onBlur={savePoll}
              disabled={isReadonly}
              className="text-[15px] font-semibold text-gray-800 leading-tight bg-transparent border-none outline-none hover:bg-gray-100 px-1 rounded -ml-1 disabled:opacity-75 disabled:hover:bg-transparent"
            />
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[9px]">
                {adminInitial}
              </span>
              My Surveys
            </div>
          </div>
          <div className="hidden md:block h-6 w-px bg-gray-200 mx-2"></div>
          <div className="hidden md:flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
              <Settings size={16} />
            </button>
            <button 
              onClick={() => setShowQR(true)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              title="Share"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center justify-start md:justify-center w-full md:w-1/3 h-10 md:h-full order-3 md:order-2 border-t md:border-t-0 border-gray-100 pt-1 md:pt-0">
          <div className="flex gap-6 h-full">
            <button 
              onClick={() => setActiveTab('Create')}
              disabled={isReadonly || isEnded}
              className={`h-full px-2 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'Create' ? 'border-indigo-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'} ${(isReadonly || isEnded) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create
            </button>
            <button 
              onClick={() => setActiveTab('Results')}
              className={`h-full px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Results' ? 'border-indigo-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Results
              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">{participants.length}</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-1/3 order-2 md:order-3">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
              {adminInitial}
            </div>
          </div>
          <div className="hidden md:block h-6 w-px bg-gray-200 mx-1"></div>
          
          {!isReadonly && (
            <>
              <button 
                onClick={savePoll}
                className={`px-3 py-1.5 md:px-4 md:py-1.5 text-xs md:text-sm font-medium rounded-full transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap shrink-0 ${isSaving ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                {isSaving ? 'Saving...' : 'Save Poll'}
              </button>
              <button 
                onClick={() => setIsPreviewMode(true)}
                className="hidden md:flex px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-full transition-colors items-center gap-2 whitespace-nowrap shrink-0"
              >
                <MonitorPlay size={16} /> Preview
              </button>
              <div className="flex rounded-full overflow-hidden shadow-sm shrink-0">
                <button onClick={handleStartPresentation} className={`px-2 py-1.5 md:px-4 md:py-1.5 text-white text-xs md:text-sm font-medium transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  <Play size={14} fill="currentColor" /> <span className="hidden sm:inline">{isLive ? 'Stop presentation' : 'Start presentation'}</span><span className="inline sm:hidden">{isLive ? 'Stop' : 'Start'}</span>
                </button>
                <button className={`hidden sm:flex px-2 py-1.5 items-center justify-center transition-colors border-l ${isLive ? 'bg-red-500 hover:bg-red-600 border-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white'}`}>
                  <ChevronDown size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Read-Only Banner */}
      {isReadonly && (
        <div className="h-10 bg-[#ffcc00] flex items-center justify-center px-6 shrink-0 shadow-sm z-10 text-sm font-semibold text-gray-900 border-b border-[#e6b800]">
          Read-Only Mode: This poll has ended. You are viewing the final results.
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-y-hidden overflow-x-hidden">
        
        {/* Left Sidebar (Slides) */}
        {(!isLive || isEnded) && (
        <aside className="w-full md:w-48 bg-[#f5f5f5] border-b md:border-b-0 md:border-r border-gray-200 flex flex-row md:flex-col p-2 md:p-4 shrink-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto custom-scrollbar h-auto md:h-full items-center md:items-stretch gap-4 md:gap-0">
          {!isEnded && !isReadonly && (
          <button onClick={handleNewSlide} className="w-auto md:w-full py-2 px-4 md:py-2.5 md:px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-full text-xs md:text-sm font-medium flex items-center justify-center gap-1 md:gap-2 transition-colors md:mb-6 shadow-sm whitespace-nowrap shrink-0">
            <Plus size={16} /> <span className="hidden sm:inline">New slide</span><span className="inline sm:hidden">New</span>
          </button>
          )}

          <div className="flex flex-row md:flex-col gap-2 md:gap-4 md:space-y-4">
            {slides.map((slide, index) => (
              <div key={slide.id} className="flex flex-col md:flex-row gap-1 md:gap-2 items-center md:items-start shrink-0 w-24 md:w-auto" onClick={() => setActiveSlideId(slide.id)}>
                <span className="text-[10px] md:text-xs text-gray-400 font-medium md:pt-2 w-auto md:w-4 text-center">{index + 1}</span>
                <div className={`flex-1 relative group cursor-pointer transition-all ${activeSlideId === slide.id ? 'ring-2 ring-indigo-500 ring-offset-1 rounded-lg' : ''}`}>
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={10} className="text-gray-400 fill-current" />
                  </div>
                  <div className={`aspect-video bg-white rounded-lg shadow-sm p-2 flex flex-col relative overflow-hidden border-2 ${activeSlideId === slide.id ? 'border-indigo-500' : 'border-gray-200 group-hover:border-gray-300'}`}>
                    <div className="flex justify-center mb-1">
                      {slide.chartType === 'bar' ? <BarChart2 size={14} className="text-gray-800" /> : 
                       slide.chartType === 'dots' ? <LayoutGrid size={14} className="text-gray-800" /> :
                       <PieChart size={14} className="text-gray-800" />}
                    </div>
                    <div 
                      className="text-[6px] text-center text-gray-600 truncate px-1 rich-text" 
                      dangerouslySetInnerHTML={{ __html: slide.questionTitle || 'Empty slide' }}
                    />
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center text-[8px] font-bold">
                      {adminInitial}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        )}

        {/* Center Canvas (Slide Preview) */}
        <main className="flex-1 bg-[#f5f5f5] p-4 lg:p-12 overflow-y-auto md:overflow-y-auto flex flex-col items-center justify-start relative min-h-[400px] md:min-h-0">
          {/* Poll Name Input Over Card */}
          {!isLive && (
          <div className="w-full max-w-4xl mb-4 flex items-center mt-4">
            <input 
              type="text" 
              value={pollName} 
              onChange={(e) => setPollName(e.target.value)}
              placeholder="Untitled poll"
              disabled={isReadonly || isEnded}
              className="text-xl font-bold bg-transparent text-gray-800 focus:outline-none focus:border-b-2 focus:border-indigo-500 pb-1 w-1/2 transition-colors disabled:opacity-70 disabled:border-b-0"
            />
          </div>
          )}

          {/* Canvas always renders, even in Results tab, so admin can see slide chart */}
          <div className="w-full max-w-4xl min-h-[400px] max-h-[85vh] aspect-[16/9] bg-white rounded-xl shadow-md border border-gray-100 relative flex flex-col p-6 md:p-10 overflow-hidden mt-auto shrink-0">
            
            {/* Ended Lock Overlay */}
            {(isEnded && activeTab === 'Create') && (
              <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl">
                <div className="bg-white border border-gray-200 shadow-xl rounded-2xl px-8 py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <p className="font-semibold text-slate-700 text-lg">Poll Ended</p>
                  <p className="text-slate-400 text-sm mt-1">This poll is read-only. Start a new presentation to edit.</p>
                </div>
              </div>
            )}

            {/* On-Canvas Question Edit */}
            <div className="w-full relative mt-4">
              <ContentEditable
                html={activeSlide.questionTitle}
                disabled={isEnded || isReadonly}
                onChange={(e) => updateActiveSlide({ questionTitle: e.target.value })}
                onFocus={() => setIsEditingTitleOnCanvas(true)}
                onBlur={() => setIsEditingTitleOnCanvas(false)}
                tagName="div"
                data-placeholder="Your question..."
                className={`w-full text-3xl md:text-4xl leading-tight font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none rich-text ${isEditingTitleOnCanvas ? 'ring-2 ring-indigo-500/50 rounded-xl bg-gray-50/50 py-2 text-center' : 'text-center'}`}
              />
              
              {/* Floating Formatting Toolbar (appears when editing) */}
              {isEditingTitleOnCanvas && (
                <div className="absolute top-[120%] left-0 bg-white rounded-full shadow-lg border border-gray-100 p-1 flex items-center gap-1 z-20">
                  <div className="relative">
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); setIsFontMenuOpen(!isFontMenuOpen); setIsColorMenuOpen(false); }} 
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full flex items-center gap-1"
                    >
                      Font <ChevronDown size={14} />
                    </button>
                    {isFontMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[120px] py-1">
                        {fontFamilies.map(font => (
                          <button
                            key={font.name}
                            onMouseDown={(e) => { e.preventDefault(); handleFormat('fontName', font.value); setIsFontMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            style={{ fontFamily: font.value }}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  
                  <div className="relative">
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); setIsColorMenuOpen(!isColorMenuOpen); setIsFontMenuOpen(false); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                    >
                      <div className="w-4 h-4 rounded-full bg-indigo-500 border border-gray-300"></div>
                    </button>
                    {isColorMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1 w-max">
                        {textColors.map(color => (
                          <button
                            key={color}
                            onMouseDown={(e) => { e.preventDefault(); handleFormat('foreColor', color); setIsColorMenuOpen(false); }}
                            className="w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Bold size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Italic size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Underline size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><Strikethrough size={14} /></button>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"><LinkIcon size={14} /></button>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"><MoreHorizontal size={14} /></button>
                </div>
              )}
            </div>

            {/* Custom Clean Chart Visualization matching Mentimeter */}
            <div className="flex-1 w-full flex flex-col items-center pb-4 pt-6 min-h-0 overflow-hidden">
              
              {/* --- MULTIPLE CHOICE VISUALIZATIONS --- */}
              {activeSlide.questionType === 'multiple_choice' && (
                <>
                  {(previewChartType || activeSlide.chartType) === 'bar' && (
                    <div className="w-4/5 h-[200px] flex justify-around items-end gap-8 mt-auto">
                  {activeSlide.options.map((item, i) => {
                    const displayValue = (!isLive && !isEnded && item.value === 0) ? (i * 2 + 3) : item.value;
                    const maxDisplayValue = Math.max(...activeSlide.options.map((o, idx) => (!isLive && !isEnded && o.value === 0) ? (idx * 2 + 3) : o.value), 1);
                    const heightPercent = (displayValue / maxDisplayValue) * 100;
                    
                    return (
                      <div key={item.id} className="flex flex-col items-center w-full max-w-[150px] h-full justify-end relative group">
                        <span className="text-2xl font-semibold text-gray-800 mb-2">{displayValue}</span>
                        <div 
                          className="w-full rounded-t-sm mb-4 transition-all duration-700 ease-out shadow-sm origin-bottom" 
                          style={{ backgroundColor: item.color, height: animateIn ? `${heightPercent}%` : '0%', minHeight: animateIn ? '4px' : '0px' }}
                        ></div>
                        <span className="text-base text-gray-600 font-medium text-center truncate w-full px-2">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(previewChartType || activeSlide.chartType) === 'dots' && (
                <div className="w-4/5 h-[250px] flex justify-around items-end gap-8 mt-auto">
                  {activeSlide.options.map((item, i) => {
                    const displayValue = (!isLive && !isEnded && item.value === 0) ? (i * 2 + 3) : item.value;
                    const balls = Array.from({ length: displayValue });
                    
                    return (
                      <div key={item.id} className="flex flex-col items-center justify-end w-full max-w-[150px] relative group h-full">
                        <div className="flex-1 w-full flex flex-wrap-reverse justify-center content-start gap-1.5 overflow-visible">
                          {balls.map((_, ballIndex) => (
                            <div 
                              key={ballIndex}
                              className="w-8 h-8 rounded-full shadow-sm transition-all duration-500" 
                              style={{ 
                                backgroundColor: item.color, 
                                opacity: animateIn ? 0.9 : 0,
                                transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
                                transitionDelay: `${ballIndex * 50}ms`
                              }}
                            ></div>
                          ))}
                        </div>
                        <div className="flex flex-col items-center gap-1 mt-4">
                          <span className="text-xl font-bold text-gray-800">{displayValue}</span>
                          <span className="text-base text-gray-500 font-medium truncate w-full px-2 text-center">{item.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {((previewChartType || activeSlide.chartType) === 'donut' || (previewChartType || activeSlide.chartType) === 'pie') && (
                <div className="w-full h-full max-h-[300px] aspect-square relative flex items-center justify-center mx-auto my-auto">
                  <div className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={activeSlide.options.map((opt, i) => ({ ...opt, demoValue: (!isLive && !isEnded && opt.value === 0) ? (i + 2) * 10 : opt.value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={(previewChartType || activeSlide.chartType) === 'donut' ? 80 : 0}
                          outerRadius={120}
                          paddingAngle={(previewChartType || activeSlide.chartType) === 'donut' ? 2 : 0}
                          dataKey="demoValue"
                          stroke="none"
                        >
                          {activeSlide.options.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-6">
                    {activeSlide.options.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
              )}

              {/* --- RANKING VISUALIZATION --- */}
              {activeSlide.questionType === 'ranking' && (
                <div className="w-full flex flex-col justify-center px-10 pb-8 space-y-4 my-auto">
                  <div className="w-full relative" style={{ height: `${activeSlide.options.length * 80}px` }}>
                    {(() => {
                      const sortedItems = [...activeSlide.options].map((opt, i) => ({
                         ...opt,
                          computedValue: (!isLive && !isEnded && opt.value === 0) ? (i === 0 ? 80 : i === 1 ? 65 : i === 2 ? 40 : 25) : opt.value
                      })).sort((a, b) => b.computedValue - a.computedValue);
                      
                      const maxVal = Math.max(...sortedItems.map(i => i.computedValue), 1);
                      
                      return activeSlide.options.map((item, i) => {
                        const rankIndex = sortedItems.findIndex(i => i.id === item.id);
                        const val = (!isLive && !isEnded && item.value === 0) ? (i === 0 ? 80 : i === 1 ? 65 : i === 2 ? 40 : 25) : item.value;
                        const percent = (val / maxVal) * 100;
                        
                        return (
                          <div 
                            key={item.id} 
                            className="absolute left-0 w-full flex items-end gap-4 transition-all duration-700 ease-in-out" 
                            style={{ transform: `translateY(${rankIndex * 80}px)`, top: 0 }}
                          >
                            <span className="text-2xl font-bold text-gray-500 w-8 text-right shrink-0 mb-2">{rankIndex + 1}.</span>
                            <div className="flex-1 flex flex-col justify-end h-[48px] relative mb-1">
                               <div className="absolute top-[-26px] left-0 text-[16px] text-gray-600 font-medium z-10 transition-all">{item.name}</div>
                               <div className="w-full h-full bg-gray-50 rounded-r-xl relative overflow-hidden">
                                 <div 
                                   className="absolute top-0 left-0 h-full rounded-r-xl transition-all duration-700 ease-in-out"
                                   style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: item.color }}
                                 />
                               </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* --- SCALES VISUALIZATION --- */}
              {activeSlide.questionType === 'scales' && (
                <div className="w-full flex flex-col justify-center px-10 pb-8 mt-auto">
                  <div className="space-y-5 w-full">
                    {activeSlide.options.map((item, i) => {
                      const val = (!isLive && !isEnded && item.value === 0) ? (i === 0 ? 3.5 : i === 1 ? 4.5 : 1.0) : item.value;
                      const percent = (val / 5) * 100;
                      return (
                        <div key={item.id} className="w-full relative">
                          <div className="text-gray-500 text-[15px] mb-1">{item.name || `Statement ${i+1}`}</div>
                          <div className="w-full relative h-14 flex items-center pb-1">
                            {/* The Mountain Distribution */}
                            <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="absolute bottom-2.5 left-0 w-full h-[110%]">
                              <path 
                                d={`M0,48 L${percent-40},48 C${percent-20},48 ${percent-15},8 ${percent},8 C${percent+15},8 ${percent+20},48 ${percent+40},48 L100,48 Z`} 
                                fill={item.color} 
                                opacity="0.25"
                              />
                            </svg>
                            
                            {/* The Scale Line container */}
                            <div className="w-full h-[3px] bg-gray-200 rounded-full relative z-10 flex items-center">
                              {/* The filled line */}
                              <div 
                                className="absolute left-0 h-[5px] rounded-full transition-all duration-500"
                                style={{ width: `${percent}%`, backgroundColor: item.color }}
                              ></div>
                              
                              {/* The Bubble */}
                              <div 
                                className="absolute -translate-x-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm transition-all duration-500 ring-2 ring-white"
                                style={{ left: `${percent}%`, backgroundColor: item.color }}
                              >
                                {val.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 font-medium pt-4 px-1">
                    <span>Strongly disagree</span>
                    <span>Strongly agree</span>
                  </div>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="absolute bottom-4 right-6">
              <button className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Show info examples
              </button>
            </div>
          </div>
          
          {isLive ? (
            <>
              <div className="absolute bottom-6 flex gap-4 bg-white px-4 py-2 rounded-full shadow-md border border-gray-100">
                <button onClick={handlePrevSlide} disabled={slides.findIndex(s => s.id === activeSlideId) === 0} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center px-4 font-semibold text-gray-700">
                  {slides.findIndex(s => s.id === activeSlideId) + 1} / {slides.length}
                </div>
                <button onClick={handleNextSlide} disabled={slides.findIndex(s => s.id === activeSlideId) === slides.length - 1} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border border-gray-100 text-gray-600 font-medium">
                <Users size={18} />
                <span>{(activeSlide.options || []).reduce((sum, opt) => sum + (typeof opt.value === 'object' ? opt.value.count || 0 : opt.value || 0), 0)}</span>
              </div>
            </>
          ) : (
            <button className="absolute bottom-6 right-6 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors">
              <LayoutGrid size={18} />
            </button>
          )}
          
          {/* Results Tab View - Participants List below Canvas */}
          {activeTab === 'Results' && (
            <div className="w-full max-w-4xl mt-8 mb-12 shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Users size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Participants</h3>
                      <p className="text-xs text-gray-400">{participants.length} joined</p>
                    </div>
                  </div>
                  {isLive && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live
                    </span>
                  )}
                </div>
                {participants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                      <Users size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No participants yet</p>
                    <p className="text-gray-400 text-sm mt-1">Participants will appear here once they join.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {participants.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{name}</span>
                        <span className="ml-auto text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* Right Sidebar (Properties) */}
        {!isLive && !isEnded && !isReadonly && (
        <>
        <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col shrink-0 h-auto md:h-full overflow-visible md:overflow-y-auto">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-800">Edit</h2>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto pb-24 custom-scrollbar">
            
            {/* Question Type */}
            <div className="space-y-3 relative">
              <label className="text-sm font-medium text-gray-900 block">Question</label>
              
              <button 
                onClick={() => setIsQuestionTypeMenuOpen(!isQuestionTypeMenuOpen)}
                className={`w-full bg-white hover:bg-gray-50 border ${isQuestionTypeMenuOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'} rounded-lg px-4 py-3 flex items-center justify-between transition-all`}
              >
                <div className="flex items-center gap-3">
                  <ActiveQuestionIcon size={18} className={activeQuestionTypeObj.color} />
                  <span className="text-sm font-medium text-gray-800">{activeQuestionTypeObj.name}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isQuestionTypeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {isQuestionTypeMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {QUESTION_TYPES.map((group, groupIdx) => (
                    <div key={group.group}>
                      {groupIdx > 0 && <div className="h-px bg-gray-100 mx-4 my-2"></div>}
                      <div className="px-4 py-2 text-xs font-medium text-gray-500">{group.group}</div>
                      <div className="px-2">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isSelected = activeSlide.questionType === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                updateActiveSlide({ questionType: item.id });
                                setIsQuestionTypeMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition-colors ${isSelected ? 'bg-indigo-50/50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                            >
                              <div className="flex items-center gap-3">
                                <ItemIcon size={18} className={item.color} />
                                <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{item.name}</span>
                              </div>
                              {isSelected && <Check size={16} className="text-indigo-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Chart Types (Only show for multiple choice) */}
              {activeSlide.questionType === 'multiple_choice' && (
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mt-3">
                <div className="relative flex-1 group">
                  <button 
                    onClick={() => updateActiveSlide({ chartType: 'bar' })} 
                    onMouseEnter={() => setPreviewChartType('bar')}
                    onMouseLeave={() => setPreviewChartType(null)}
                    className={`w-full py-2 flex justify-center items-center rounded-md transition-colors ${activeSlide.chartType === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <BarChart2 size={18} />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">Bars</div>
                </div>
                
                <div className="relative flex-1 group">
                  <button 
                    onClick={() => updateActiveSlide({ chartType: 'donut' })} 
                    onMouseEnter={() => setPreviewChartType('donut')}
                    onMouseLeave={() => setPreviewChartType(null)}
                    className={`w-full py-2 flex justify-center items-center rounded-md transition-colors ${activeSlide.chartType === 'donut' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v6" />
                      <path d="M21 12h-6" />
                    </svg>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">Donut</div>
                </div>

                <div className="relative flex-1 group">
                  <button 
                    onClick={() => updateActiveSlide({ chartType: 'pie' })} 
                    onMouseEnter={() => setPreviewChartType('pie')}
                    onMouseLeave={() => setPreviewChartType(null)}
                    className={`w-full py-2 flex justify-center items-center rounded-md transition-colors ${activeSlide.chartType === 'pie' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <PieChart size={18} />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">Pie</div>
                </div>

                <div className="relative flex-1 group">
                  <button 
                    onClick={() => updateActiveSlide({ chartType: 'dots' })} 
                    onMouseEnter={() => setPreviewChartType('dots')}
                    onMouseLeave={() => setPreviewChartType(null)}
                    className={`w-full py-2 flex justify-center items-center rounded-md transition-colors ${activeSlide.chartType === 'dots' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <LayoutGrid size={18} />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">Dots</div>
                </div>
              </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Question Title (Right panel) */}
            <div className="space-y-3 relative z-30">
              <label className="text-sm font-medium text-gray-900 block">Your question</label>
              <div className="w-full bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all flex flex-col shadow-sm">
                <ContentEditable 
                  html={activeSlide.questionTitle}
                  disabled={false}
                  onChange={(e) => updateActiveSlide({ questionTitle: e.target.value })}
                  tagName="div"
                  data-placeholder="What should we prioritize?"
                  className="w-full px-4 py-3 text-sm text-gray-800 focus:outline-none min-h-[80px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 rich-text rounded-t-lg"
                />
                <div className="flex items-center gap-0.5 bg-gray-50 px-2 py-1 border-t border-gray-200 rounded-b-lg relative">
                  
                  <div className="relative">
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); setIsFontMenuOpen(!isFontMenuOpen); setIsColorMenuOpen(false); }} 
                      className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md flex items-center gap-1 transition-colors"
                    >
                      Font <ChevronDown size={14} />
                    </button>
                    {isFontMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[120px] py-1 z-50">
                        {fontFamilies.map(font => (
                          <button
                            key={font.name}
                            onMouseDown={(e) => { e.preventDefault(); handleFormat('fontName', font.value); setIsFontMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            style={{ fontFamily: font.value }}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  
                  <div className="relative">
                    <button 
                      onMouseDown={(e) => { e.preventDefault(); setIsColorMenuOpen(!isColorMenuOpen); setIsFontMenuOpen(false); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 border border-gray-300"></div>
                    </button>
                    {isColorMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1 w-max z-50">
                        {textColors.map(color => (
                          <button
                            key={color}
                            onMouseDown={(e) => { e.preventDefault(); handleFormat('foreColor', color); setIsColorMenuOpen(false); }}
                            className="w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-px h-4 bg-gray-300 mx-1"></div>

                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className="w-7 h-7 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Bold size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className="w-7 h-7 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Italic size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className="w-7 h-7 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Underline size={14} /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); handleFormat('strikeThrough'); }} className="w-7 h-7 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Strikethrough size={14} /></button>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Options Editing */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 block">
                {activeSlide.questionType === 'scales' ? 'Statements' : 'Options'}
              </label>
              <div className="space-y-3">
                {activeSlide.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 group">
                    <button className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors shrink-0">
                      <GripVertical size={16} />
                    </button>
                    <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                      <input 
                        type="text" 
                        value={opt.name}
                        onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none bg-transparent"
                        placeholder="Option text"
                      />
                      <div className="flex items-center pr-2 gap-2 border-l border-gray-100 pl-2">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <ImageIcon size={16} />
                        </button>
                        <div className="w-5 h-5 rounded cursor-pointer shrink-0" style={{ backgroundColor: opt.color }}></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteOption(opt.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 p-1"
                      disabled={activeSlide.options.length <= 2}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddOption} className="w-full mt-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 border-dashed rounded-lg px-4 py-2.5 text-sm text-gray-600 font-medium transition-colors flex items-center justify-center gap-2">
                <Plus size={16} /> Add option
              </button>
            </div>

            <hr className="border-gray-100" />

            {/* Response Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Response settings</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Multiple selection</span>
                <button 
                  onClick={() => updateActiveSlide({ allowMultiple: !activeSlide.allowMultiple })}
                  className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${activeSlide.allowMultiple ? 'bg-indigo-600' : 'bg-gray-400'}`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" style={{ marginLeft: activeSlide.allowMultiple ? 'auto' : '0' }}></motion.div>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Show results as percentage</span>
                <button 
                  onClick={() => updateActiveSlide({ showPercentage: !activeSlide.showPercentage })}
                  className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${activeSlide.showPercentage ? 'bg-indigo-600' : 'bg-gray-400'}`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" style={{ marginLeft: activeSlide.showPercentage ? 'auto' : '0' }}></motion.div>
                </button>
              </div>

              <div className="bg-indigo-50 text-indigo-900 text-sm p-4 rounded-xl leading-relaxed">
                Segmentation is only available for the Bars and Dots visualizations.
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Design */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Design</h3>
              
              <button className="w-full flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <LayoutTemplate size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700">Content image</span>
                </div>
                <Plus size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            </div>
          </div>
        </aside>

        {/* Far Right Toolbar */}
        <aside className="w-16 bg-[#f5f5f5] flex flex-col items-center py-4 gap-2 shrink-0 border-l border-gray-200">
          <button className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 mb-2">
            <Settings2 size={20} />
          </button>
          
          <button className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <LayoutTemplate size={20} />
          </button>
          
          <button className="w-10 h-10 rounded-xl hover:bg-white/50 flex items-center justify-center text-gray-600 transition-colors relative group">
            <MessageSquare size={20} />
            <div className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Interactivity</div>
          </button>
          
          <button className="w-10 h-10 rounded-xl hover:bg-white/50 flex items-center justify-center text-gray-600 transition-colors relative group">
            <Paintbrush size={20} />
            <div className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Design</div>
          </button>
          
          <button className="w-10 h-10 rounded-xl hover:bg-white/50 flex items-center justify-center text-gray-600 transition-colors relative group">
            <MonitorPlay size={20} />
            <div className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Present</div>
          </button>
          
          <button className="w-10 h-10 rounded-xl hover:bg-white/50 flex items-center justify-center text-gray-600 transition-colors relative group">
            <LayoutGrid size={20} />
            <div className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Templates</div>
          </button>

          <div className="mt-auto">
            <button className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center transition-colors">
              <HelpCircle size={16} />
            </button>
          </div>
        </aside>
        </>
        )}

      </div>

      {/* --- SPLIT-SCREEN PREVIEW MODAL --- */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-[100] bg-[#fafafa] flex flex-col font-sans">
          {/* Yellow Banner */}
          <div className="h-12 bg-[#ffcc00] flex items-center justify-between px-6 shrink-0 shadow-sm relative">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">Show test responses</span>
              <div className="w-9 h-5 bg-indigo-600 rounded-full flex items-center px-1 cursor-pointer">
                <div className="w-3.5 h-3.5 bg-white rounded-full ml-auto"></div>
              </div>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-900">
              Test your presentation — responses will not be saved.
            </div>

            <button 
              onClick={() => setIsPreviewMode(false)}
              className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded-full text-gray-900 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Main Content Split */}
          <div className="flex-1 flex items-start justify-center p-8 gap-16 overflow-y-auto">
            
            {/* Left: Your Screen */}
            <div className="flex flex-col flex-1 max-w-5xl">
              <div className="flex items-center gap-1 mb-3 text-sm text-gray-700 font-medium">
                Your screen <HelpCircle size={14} className="text-gray-400" />
              </div>
              
              <div className="w-full aspect-[16/9] bg-white border-[3px] border-gray-900 rounded-2xl shadow-xl relative flex flex-col p-12 overflow-hidden group">
                
                {/* Navigation Arrows inside Your Screen */}
                {currentSlideIndex > 0 && (
                  <button onClick={handlePrevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                    <ChevronLeft size={24} />
                  </button>
                )}
                {currentSlideIndex < slides.length - 1 && (
                  <button onClick={handleNextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                    <ChevronRight size={24} />
                  </button>
                )}

                {/* Slide Content */}
                <div className="w-full relative">
                  <h1 
                    className="w-full text-3xl md:text-4xl leading-tight font-semibold text-gray-900 bg-transparent text-left px-8 rich-text"
                    dangerouslySetInnerHTML={{ __html: activeSlide.questionTitle || 'Untitled question' }}
                  />
                  <div className="text-sm text-gray-400 mt-2 px-8 flex items-center gap-2">
                    <Check size={14} /> Responses are hidden
                  </div>
                </div>

                {/* Chart Visualizations (Presentation Scale) */}
                <div className="flex-1 w-full flex flex-col items-center pb-8 pt-10 min-h-0">
                  
                  {activeSlide.questionType === 'multiple_choice' && (
                    <>
                      {activeSlide.chartType === 'bar' && (
                        <div className="w-4/5 h-[300px] flex justify-around items-end gap-12 mt-auto">
                          {activeSlide.options.map((item) => {
                            const currentSlideVotes = previewVotes[activeSlideId] || {};
                            const displayValue = currentSlideVotes[item.id] || 0;
                            const maxDisplayValue = Math.max(1, ...activeSlide.options.map(o => currentSlideVotes[o.id] || 0));
                            const heightPercent = (displayValue / maxDisplayValue) * 100;
                            return (
                              <div key={item.id} className="flex flex-col items-center w-full max-w-[150px] h-full justify-end relative">
                                <span className="text-2xl font-semibold text-gray-800 mb-3">
                                  {activeSlide.showPercentage ? `${Math.round(heightPercent)}%` : displayValue}
                                </span>
                                <div 
                                  className="w-full rounded-t-sm mb-4 shadow-sm transition-all duration-700 ease-out origin-bottom" 
                                  style={{ backgroundColor: item.color, height: animateIn ? `${heightPercent}%` : '0%', minHeight: animateIn ? '4px' : '0px' }}
                                ></div>
                                <span className="text-lg text-gray-600 font-medium text-center truncate w-full px-2">{item.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeSlide.chartType === 'dots' && (
                        <div className="w-4/5 h-[300px] flex justify-around items-end gap-12 mt-auto">
                          {activeSlide.options.map((item) => {
                            const currentSlideVotes = previewVotes[activeSlideId] || {};
                            const displayValue = currentSlideVotes[item.id] || 0;
                            const balls = Array.from({ length: displayValue });
                            return (
                              <div key={item.id} className="flex flex-col items-center justify-end w-full max-w-[150px] relative h-full">
                                <div id={`dot-stack-base-${item.id}`} className="flex-1 w-full flex flex-wrap-reverse justify-center content-start gap-2 overflow-visible">
                                  {balls.map((_, ballIndex) => (
                                    <div 
                                      key={ballIndex}
                                      className="w-8 h-8 rounded-full shadow-sm transition-all duration-500" 
                                      style={{ 
                                        backgroundColor: item.color, 
                                        opacity: animateIn ? 0.9 : 0,
                                        transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(20px)',
                                        transitionDelay: `${ballIndex * 50}ms`
                                      }}
                                    ></div>
                                  ))}
                                </div>
                                <div className="flex flex-col items-center gap-1 mt-4">
                                  <span className="text-2xl font-bold text-gray-800">
                                    {activeSlide.showPercentage ? `${Math.round((displayValue / Math.max(1, Object.values(currentSlideVotes).reduce((a,b)=>a+b,0))) * 100)}%` : displayValue}
                                  </span>
                                  <span className="text-lg text-gray-500 font-medium truncate w-full px-2 text-center">{item.name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(activeSlide.chartType === 'donut' || activeSlide.chartType === 'pie') && (
                        <div className="w-full flex flex-col items-center justify-center my-auto">
                          <div className="w-full h-[320px] relative">
                            {Object.values(previewVotes[activeSlideId] || {}).reduce((a, b) => a + b, 0) === 0 ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 border-8 border-gray-100 rounded-full flex items-center justify-center text-gray-400 font-medium text-lg">
                                  Waiting for votes...
                                </div>
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                  <Pie
                                    data={activeSlide.options.map(opt => ({ ...opt, displayValue: (previewVotes[activeSlideId] || {})[opt.id] || 0 }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={activeSlide.chartType === 'donut' ? 90 : 0}
                                    outerRadius={140}
                                    paddingAngle={activeSlide.chartType === 'donut' ? 2 : 0}
                                    dataKey="displayValue"
                                    stroke="none"
                                  >
                                    {activeSlide.options.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </RechartsPie>
                              </ResponsiveContainer>
                            )}
                          </div>
                          <div className="flex justify-center gap-8 mt-6">
                            {activeSlide.options.map((item) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-base font-medium text-gray-700">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeSlide.questionType === 'scales' && (
                    <div className="w-full flex flex-col justify-center px-16 pb-4 my-auto">
                      <div className="space-y-12 w-full">
                        {activeSlide.options.map((item, i) => {
                          const currentSlideVotes = previewVotes[activeSlideId] || {};
                          const stats = currentSlideVotes[item.id] || { sum: 0, count: 0 };
                          const val = stats.count > 0 ? stats.sum / stats.count : 0; 
                          const percent = (val / 5) * 100;
                          return (
                            <div key={item.id} className="w-full relative">
                              <div className="text-gray-700 text-base font-medium mb-3">{item.name || `Statement ${i+1}`}</div>
                              <div className="w-full relative h-10 flex items-center pb-2">
                                <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="absolute bottom-3 left-0 w-full h-[150%] transition-all duration-500">
                                  {val > 0 && (
                                    <path 
                                      d={`M0,48 L${percent-40},48 C${percent-20},48 ${percent-15},8 ${percent},8 C${percent+15},8 ${percent+20},48 ${percent+40},48 L100,48 Z`} 
                                      fill={item.color} 
                                      opacity="0.25"
                                    />
                                  )}
                                </svg>
                                
                                <div className="w-full h-[4px] bg-gray-200 rounded-full relative z-10 flex items-center">
                                  <div 
                                    className="absolute left-0 h-[6px] rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%`, backgroundColor: item.color }}
                                  ></div>
                                  {val > 0 && (
                                    <div 
                                      className="absolute -translate-x-1/2 w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[14px] font-bold shadow-md ring-[3px] ring-white transition-all duration-500"
                                      style={{ left: `${percent}%`, backgroundColor: item.color }}
                                    >
                                      {val.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-500 font-semibold pt-6">
                        <span>Strongly disagree</span>
                        <span>Strongly agree</span>
                      </div>
                    </div>
                  )}

                  {/* --- PREVIEW RANKING --- */}
                  {activeSlide.questionType === 'ranking' && (
                    <div className="w-full flex flex-col justify-center px-16 pb-8 space-y-4 my-auto">
                      <div className="w-full relative" style={{ height: `${activeSlide.options.length * 80}px` }}>
                        {(() => {
                          const currentSlideVotes = previewVotes[activeSlideId] || {};
                          const sortedItems = [...activeSlide.options].map((opt) => ({
                             ...opt,
                             computedValue: currentSlideVotes[opt.id] || 0
                          })).sort((a, b) => b.computedValue - a.computedValue);
                          
                          const maxVal = Math.max(...sortedItems.map(i => i.computedValue), 1);
                          
                          return activeSlide.options.map((item) => {
                            const rankIndex = sortedItems.findIndex(i => i.id === item.id);
                            const val = currentSlideVotes[item.id] || 0;
                            const percent = (val / maxVal) * 100;
                            
                            return (
                              <div 
                                key={item.id} 
                                className="absolute left-0 w-full flex items-end gap-4 transition-all duration-700 ease-in-out" 
                                style={{ transform: `translateY(${rankIndex * 80}px)`, top: 0 }}
                              >
                                <span className="text-2xl font-bold text-gray-500 w-8 text-right shrink-0 mb-2">{rankIndex + 1}.</span>
                                <div className="flex-1 flex flex-col justify-end h-[48px] relative mb-1">
                                   <div className="absolute top-[-26px] left-0 text-[16px] text-gray-600 font-medium z-10 transition-all">{item.name}</div>
                                   <div className="w-full h-full bg-gray-50 rounded-r-xl relative overflow-hidden">
                                     <div 
                                       className="absolute top-0 left-0 h-full rounded-r-xl transition-all duration-700 ease-in-out"
                                       style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: item.color }}
                                     />
                                   </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                  <div className="absolute bottom-4 right-8 flex items-center gap-4 text-xs font-medium text-gray-500">
                    <span>Join at <b className="text-gray-900">surveysphere.com</b> 1234 5678</span>
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg group relative cursor-help shadow-sm border border-gray-200">
                      
                      {/* Registered Counter */}
                      <div className="flex items-center gap-1.5 border-r border-gray-300 pr-3" title="Registered Participants">
                        <Users size={14} className="text-indigo-600"/> 
                        <span className="font-bold text-gray-900 text-[13px]">{participants.length}</span>
                      </div>
                      
                      {/* Answered Counter */}
                      <div className="flex items-center gap-1.5 pl-1" title="Answered this question">
                        <CheckSquare size={14} className="text-emerald-600"/> 
                        <span className="font-bold text-gray-900 text-[13px]">{responsesCount}</span>
                      </div>

                      {participants.length > 0 && (
                        <div className="absolute bottom-full mb-2 right-0 bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-xl w-max min-w-[140px] shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50 flex flex-col gap-1.5 max-h-[250px] overflow-y-auto custom-scrollbar border border-white/10">
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                             <span>Joined</span>
                             <span className="bg-white/10 px-1.5 rounded-full text-white">{participants.length}</span>
                           </div>
                           {participants.map((name, i) => (
                              <div key={i} className="flex items-center gap-2.5 hover:bg-white/5 p-1 -mx-1 rounded transition-colors">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/80 text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-white/20 shadow-sm">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium truncate text-gray-100">{name}</span>
                              </div>
                           ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      <LayoutGrid size={12}/> {currentSlideIndex + 1}/{slides.length}
                    </div>
                  </div>
                </div>
              </div>

            {/* Right: Participant's screen */}
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-1 mb-3 text-sm text-gray-700 font-medium">
                Participant's screen <HelpCircle size={14} className="text-gray-400" />
              </div>
              
              <div className="w-[340px] h-[680px] border-[10px] border-gray-900 rounded-[3rem] bg-white overflow-hidden shadow-2xl relative flex flex-col font-sans">
                {/* Mobile Header */}
                <div className="h-16 flex items-center justify-center border-b border-gray-100 shrink-0 mt-4">
                  <div className="font-bold text-xl text-gray-900 tracking-tight">SurveySphere</div>
                </div>

                {/* Mobile Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 pb-20 custom-scrollbar">
                  <h2 
                    className="text-xl font-bold text-gray-800 leading-tight mb-6 rich-text"
                    dangerouslySetInnerHTML={{ __html: activeSlide.questionTitle || 'Untitled question' }}
                  />

                  {/* Mobile Multiple Choice */}
                  {activeSlide.questionType === 'multiple_choice' && (
                    <div className="space-y-4">
                      {mobileSubmitted ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
                            <Check size={32} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Vote cast!</h3>
                          <p className="text-gray-500 text-sm">Wait for the presenter to show the next slide.</p>
                        </div>
                      ) : (
                        <>
                          {activeSlide.options.map((item, i) => {
                            const isSelected = mobileAnswers[item.id];
                            return (
                              <button 
                                key={item.id} 
                                onClick={() => {
                                  if (activeSlide.allowMultiple) {
                                    setMobileAnswers(prev => {
                                      const newAnswers = { ...prev };
                                      if (newAnswers[item.id]) delete newAnswers[item.id];
                                      else newAnswers[item.id] = true;
                                      return newAnswers;
                                    });
                                  } else {
                                    setMobileAnswers({ [item.id]: true });
                                  }
                                }}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-colors group relative ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-600 hover:bg-indigo-50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  {activeSlide.allowMultiple && (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>
                                      {isSelected && <Check size={14} />}
                                    </div>
                                  )}
                                  <span className={`text-lg font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-indigo-900'}`}>{item.name || `Option ${i+1}`}</span>
                                </div>
                              </button>
                            );
                          })}
                          <button 
                            onClick={() => handleMobileSubmit('multiple_choice')}
                            disabled={!Object.keys(mobileAnswers).length}
                            className={`w-full mt-6 text-white font-semibold rounded-full py-4 text-lg transition-colors ${Object.keys(mobileAnswers).length ? 'bg-gray-900 hover:bg-black' : 'bg-gray-900 opacity-50 cursor-not-allowed'}`}
                          >
                            Submit
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mobile Scales */}
                  {activeSlide.questionType === 'scales' && (
                    <div className="space-y-10">
                      {mobileSubmitted ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
                            <Check size={32} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Thanks for rating!</h3>
                          <p className="text-gray-500 text-sm">Wait for the presenter to show the next slide.</p>
                        </div>
                      ) : (
                        <>
                          {activeSlide.options.map((item, i) => {
                            const val = mobileAnswers[item.id] || 3;
                            return (
                              <div key={item.id} className="w-full">
                                <div className="flex justify-between items-center mb-6">
                                  <span className="text-[17px] font-bold text-gray-800">{item.name || `Statement ${i+1}`}</span>
                                  <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors">Skip</button>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold text-indigo-600">1</span>
                                  <div className="flex-1 relative flex items-center h-8">
                                    <input 
                                      type="range" 
                                      min="1" max="5" step="1"
                                      value={val}
                                      onChange={(e) => setMobileAnswers({...mobileAnswers, [item.id]: parseInt(e.target.value)})}
                                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-500">5</span>
                                </div>
                                
                                <div className="flex justify-between text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                                  <span>Strongly disagree</span>
                                  <span>Strongly agree</span>
                                </div>
                              </div>
                            );
                          })}
                          
                          <button 
                            onClick={() => handleMobileSubmit('scales')}
                            className="w-full mt-8 bg-gray-900 hover:bg-black transition-colors text-white font-semibold rounded-full py-4 text-lg"
                          >
                            Submit
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mobile Ranking */}
                  {activeSlide.questionType === 'ranking' && (
                    <div className="space-y-4">
                      {mobileSubmitted ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
                            <Check size={32} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Ranking submitted!</h3>
                          <p className="text-gray-500 text-sm">Wait for the presenter to show the next slide.</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-500 mb-3 font-medium">Tap options in order of preference</div>
                          {activeSlide.options.map((item, i) => {
                            const order = Array.isArray(mobileAnswers.order) ? mobileAnswers.order : [];
                            const rankIndex = order.indexOf(item.id);
                            const isSelected = rankIndex !== -1;
                            
                            return (
                              <button 
                                key={item.id} 
                                onClick={() => {
                                  setMobileAnswers(prev => {
                                    const currentOrder = Array.isArray(prev.order) ? prev.order : [];
                                    if (currentOrder.includes(item.id)) {
                                      return { ...prev, order: currentOrder.filter(id => id !== item.id) };
                                    } else {
                                      return { ...prev, order: [...currentOrder, item.id] };
                                    }
                                  });
                                }}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all group flex items-center justify-between mb-3 ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 shadow-sm'}`}
                              >
                                <span className={`text-lg font-medium truncate pr-4 ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{item.name || `Item ${i+1}`}</span>
                                {isSelected && (
                                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 animate-in zoom-in duration-200">
                                    {rankIndex + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          <button 
                            onClick={() => handleMobileSubmit('ranking')}
                            className="w-full mt-6 bg-gray-900 hover:bg-black transition-colors text-white font-semibold rounded-full py-4 text-lg"
                          >
                            Submit Ranking
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Mobile Scroll indicator fade */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Voting Animations */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <AnimatePresence>
          {activeAnimations.map(anim => (
            <motion.div
              key={anim.id}
              initial={{ 
                x: anim.startX, 
                y: anim.startY, 
                scale: 0, 
                opacity: 0 
              }}
              animate={{ 
                x: anim.targetX, 
                y: anim.targetY, 
                scale: 1, 
                opacity: 1 
              }}
              exit={{ 
                scale: 0, 
                opacity: 0 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 15, 
                mass: 1 
              }}
              className="absolute w-8 h-8 rounded-full shadow-lg border border-white"
              style={{ backgroundColor: anim.color }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* QR Code / Share Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full relative flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <QrCode size={24} />
              </div>
              
              <h2 className="text-xl font-bold text-slate-800 mb-1">Scan to Join</h2>
              <p className="text-sm text-slate-500 mb-6 text-center">Participants can scan this QR code with their mobile device to instantly join the live poll.</p>
              
              <div className="p-4 bg-white border-2 border-slate-100 rounded-xl mb-6">
                <QRCodeSVG value={`${window.location.origin}/live?code=${surveyCode}`} size={200} />
              </div>

              <div className="w-full">
                <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Or share link</div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/live?code=${surveyCode}`}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg px-3 py-2 outline-none"
                  />
                  <button 
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/live?code=${surveyCode}`).then(() => alert('Copied!'))}
                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors"
                    title="Copy Link"
                  >
                    <LinkIcon size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LivePanel;
