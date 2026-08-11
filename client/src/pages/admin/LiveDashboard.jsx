import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Play, Radio, Users, Edit2, Trash2, Link as LinkIcon, QrCode, X, Copy, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com');

const LiveDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [liveState, setLiveState] = useState({ isActive: false, question: null });

  const getTotalVotes = (votes) => {
    if (!votes) return 0;
    return Object.values(votes).reduce((acc, val) => {
      if (typeof val === 'number') return acc + val;
      if (val && typeof val === 'object' && val.count !== undefined) return acc + val.count;
      return acc;
    }, 0);
  };

  useEffect(() => {
    socket.on('live-state-update', (state) => {
      setLiveState(state);
    });
    socket.emit('request-live-state');
    
    return () => socket.off('live-state-update');
  }, []);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter for only live polls
          setPolls(data.filter(s => s.type === 'live'));
        }
      } catch (err) {
        console.error('Failed to fetch live polls', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  const createLivePoll = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Untitled Live Poll',
          type: 'live',
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        navigate(`/admin/live/builder/${data._id}`);
      }
    } catch (err) {
      console.error('Failed to create live poll', err);
    }
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(`${window.location.origin}/live?code=${code}`)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
  };

  const deletePoll = async (id) => {
    if (!window.confirm('Are you sure you want to delete this live poll?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPolls(polls.filter(p => p._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete poll', err);
    }
  };

  const startPoll = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'Active' })
      });
      if (res.ok) {
        navigate(`/admin/live/builder/${id}?start=true`);
      }
    } catch (err) {
      console.error('Failed to start poll', err);
      navigate(`/admin/live/builder/${id}?start=true`);
    }
  };

  const endPoll = async (id) => {
    try {
      const pollToStop = polls.find(p => p._id === id);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'Ended' })
      });
      if (res.ok) {
        setPolls(polls.map(p => p._id === id ? { ...p, status: 'Ended' } : p));
        if (pollToStop) socket.emit('admin-stop-poll', pollToStop.surveyCode);
      }
    } catch (err) {
      console.error('Failed to end poll', err);
      const pollToStop = polls.find(p => p._id === id);
      if (pollToStop) socket.emit('admin-stop-poll', pollToStop.surveyCode);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-slate-50 relative">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Live Polls</h1>
          <p className="text-slate-500">Engage your audience in real-time with interactive presentations.</p>
        </div>
        <button 
          onClick={createLivePoll}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
        >
          <Plus size={20} /> Create Live Poll
        </button>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center w-full max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search live polls..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>
            <button className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 font-medium rounded-tl-xl">Presentation Name</th>
                <th className="p-4 font-medium">Poll Code</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Answers</th>
                <th className="p-4 font-medium">Share</th>
                <th className="p-4 font-medium">Date Modified</th>
                <th className="p-4 font-medium text-center rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading live polls...</td></tr>
              ) : polls.filter(p => p.title.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500 bg-white rounded-b-xl border-t border-slate-100">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Radio size={24} className="text-slate-300" />
                      </div>
                      <p className="text-base font-medium text-slate-600 mb-1">No live polls found</p>
                      <p className="text-sm text-slate-400">Click 'Create Live Poll' to get started!</p>
                    </div>
                  </td>
                </tr>
              ) : polls.filter(p => p.title.toLowerCase().includes(search.toLowerCase())).map((poll, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={poll.id} 
                  className="border-b border-slate-100 hover:bg-white transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        poll.status === 'Active' ? 'bg-emerald-100 text-emerald-600' :
                        poll.status === 'Ended' ? 'bg-slate-100 text-slate-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <Radio size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{poll.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                      {poll.surveyCode}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      poll.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                      poll.status === 'Ended' ? 'bg-slate-200 text-slate-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {poll.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={16} className="text-slate-400" />
                      {(liveState.isActive && liveState.question?.pollId === poll._id) 
                        ? getTotalVotes(liveState.votes) 
                        : (poll.liveResults?.participants?.length || poll.responseCount || 0)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopy(poll.surveyCode, poll._id)}
                        className={`p-2 rounded-lg border transition-colors flex items-center gap-1 ${copiedId === poll._id ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                        title="Copy Link"
                      >
                        {copiedId === poll._id ? <Copy size={16} /> : <LinkIcon size={16} />}
                      </button>
                      <button 
                        onClick={() => setShowQR(`${window.location.origin}/live?code=${poll.surveyCode}`)}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                        title="Show QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(poll.updatedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2 transition-opacity">
                      {poll.status === 'Ended' ? (
                        <button onClick={() => navigate(`/admin/live/builder/${poll._id}?readonly=true`)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="View Results">
                          <Eye size={18} />
                        </button>
                      ) : (
                        <>
                          {poll.status === 'Active' ? (
                            <button onClick={() => endPoll(poll._id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="End Live Poll">
                              <span className="font-bold text-xs px-1">END</span>
                            </button>
                          ) : (
                            <button onClick={() => startPoll(poll._id)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Start Live Poll">
                              <Play size={18} />
                            </button>
                          )}
                          <button onClick={() => navigate(`/admin/live/builder/${poll._id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Properties">
                            <Edit2 size={18} />
                          </button>
                        </>
                      )}
                      <button onClick={() => deletePoll(poll._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setShowQR(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full relative flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <QrCode size={24} />
              </div>
              
              <h2 className="text-xl font-bold text-slate-800 mb-1">Scan to Join</h2>
              <p className="text-sm text-slate-500 mb-6 text-center">Participants can scan this QR code with their mobile device to instantly join the live poll.</p>
              
              <div className="p-4 bg-white border-2 border-slate-100 rounded-xl">
                <QRCodeSVG value={showQR} size={200} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveDashboard;
