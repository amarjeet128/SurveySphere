import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, CheckCircle, Clock, Link as LinkIcon, QrCode, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const StatCard = ({ title, value, icon, trend, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} className="glass p-6 rounded-2xl flex items-start justify-between group hover:-translate-y-1 transition-transform duration-300">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><span className="bg-emerald-400/10 px-2 py-0.5 rounded-full">{trend}</span> from last month</p>
    </div>
    <div className="p-3 bg-white/60 rounded-xl text-indigo-600 group-hover:bg-indigo-500/20 transition-colors">{icon}</div>
  </motion.div>
);

const Dashboard = () => {
  const [showQR, setShowQR] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${code}`)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => console.error('Failed to copy', err));
  };

  const [stats, setStats] = useState({ responses: 0, completion: 0, time: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [resSurveys, resAnalytics] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/responses/analytics`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (resSurveys.ok) {
          const data = await resSurveys.json();
          setSurveys(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
        
        if (resAnalytics.ok) {
          const data = await resAnalytics.json();
          const totalResponses = data.length;
          
          let totalTime = 0;
          let completedCount = 0;
          
          data.forEach(r => {
             totalTime += (r.timeTaken || 0);
             completedCount += 1; // Assuming all saved are completed
          });
          
          const avgTime = totalResponses > 0 ? Math.round(totalTime / totalResponses) : 0;
          const avgCompletion = totalResponses > 0 ? Math.round((completedCount / totalResponses) * 100) : 0;
          
          setStats({ responses: totalResponses, completion: avgCompletion, time: avgTime });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back, Admin 👋</h1>
          <p className="text-slate-400 text-sm">Here's what's happening with your surveys today.</p>
        </div>
        <Link to="/admin/surveys/new" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-slate-900 rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all active:scale-95">
          + Create Survey
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Surveys" value={surveys.length} icon={<FileText size={24} />} trend={`+${surveys.length}`} delay={0.1} />
        <StatCard title="Total Responses" value={stats.responses} icon={<Users size={24} />} trend={`+${stats.responses}`} delay={0.2} />
        <StatCard title="Avg. Completion" value={`${stats.completion}%`} icon={<CheckCircle size={24} />} trend="0%" delay={0.3} />
        <StatCard title="Avg. Time" value={`${stats.time}s`} icon={<Clock size={24} />} trend="0s" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="lg:col-span-2 glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Recent Surveys</h3>
          <div className="space-y-4">
            {surveys.length === 0 ? (
              <p className="text-slate-500 italic p-4 bg-white/40 rounded-xl">No surveys created yet. Click "+ Create Survey" to get started.</p>
            ) : (
              surveys.slice(0, 4).map((survey) => (
                <div key={survey._id} className="flex items-center justify-between p-4 bg-white/40 rounded-xl hover:bg-white/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${survey.status === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : survey.status === 'Published' ? 'bg-blue-400' : 'bg-slate-400'}`}></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-800">{survey.title}</h4>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${survey.type === 'live' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {survey.type === 'live' ? 'Live Poll' : 'Survey'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{survey.status || 'Draft'} • {new Date(survey.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {survey.surveyCode && (
                      <>
                        <button onClick={() => setShowQR(`${window.location.origin}/s/${survey.surveyCode}`)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-200 rounded-lg transition-all" title="Share via QR">
                          <QrCode size={18} />
                        </button>
                        <button onClick={() => handleCopy(survey.surveyCode, survey._id)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-200 rounded-lg transition-all" title="Copy Link">
                          {copiedId === survey._id ? <CheckCircle size={18} className="text-emerald-500" /> : <LinkIcon size={18} />}
                        </button>
                      </>
                    )}
                    <Link to={`/admin/analytics?survey=${survey._id}`} className="px-4 py-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium ml-2">Analytics</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.6 }} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Activity Feed</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            {[].map((text, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 bg-white text-slate-400 z-10 shrink-0">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg glass">
                  <p className="text-sm text-slate-700">{text}</p>
                  <span className="text-xs text-slate-400">{i + 1}h ago</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* QR Code Modal Overlay */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass p-8 rounded-3xl max-w-sm w-full relative text-center"
            >
              <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Scan to Participate</h3>
              <p className="text-slate-400 text-sm mb-8">Respondents can scan this QR code with their mobile device to instantly open the survey.</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto mb-6 shadow-2xl">
                <QRCodeSVG value={showQR} size={200} level={"H"} fgColor="#0f172a" />
              </div>
              
              <div className="bg-white/60 p-3 rounded-xl border border-slate-200 break-all text-xs text-slate-400">
                {showQR}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;
