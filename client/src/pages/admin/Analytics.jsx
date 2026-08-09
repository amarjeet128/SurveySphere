import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Search, Filter, Trash2, Eye } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899'];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSurvey, setSelectedSurvey] = useState('all');
  const [allResponses, setAllResponses] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  
  const [analyticsData, setAnalyticsData] = useState({
    growthData: [],
    completionData: [],
    recentResponses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [resAnalytics, resSurveys] = await Promise.all([
          fetch('http://localhost:5000/api/responses/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/surveys', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (!resAnalytics.ok || !resSurveys.ok) throw new Error('Failed to fetch analytics or surveys');
        
        const analyticsJson = await resAnalytics.json();
        const surveysJson = await resSurveys.json();
        
        setAllResponses(analyticsJson);
        setSurveys(surveysJson);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleDeleteResponse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this response?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/responses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllResponses(allResponses.filter(r => r._id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete response');
      }
    } catch (err) {
      alert('Error deleting response');
    }
  };

  // Derive charts and table based on selected survey
  useEffect(() => {
    let filteredData = allResponses;
    if (selectedSurvey !== 'all') {
      filteredData = allResponses.filter(r => r.surveyId && r.surveyId._id === selectedSurvey);
    }
    
    const recent = filteredData.map(r => {
      // Try to find a name from answers if respondentName is empty
      let fallbackName = 'Anonymous';
      if (!r.respondentName && r.answers && r.answers.length > 0) {
        const firstAnswer = r.answers[0].answer;
        if (typeof firstAnswer === 'string' && firstAnswer.length < 50) {
          fallbackName = firstAnswer;
        }
      }

      return {
        id: r._id,
        name: r.respondentName || fallbackName,
        email: r.respondentEmail || 'N/A',
        survey: r.surveyId ? r.surveyId.title : 'Unknown Survey',
        date: new Date(r.completedAt).toLocaleDateString(),
        time: r.timeTaken ? `${Math.floor(r.timeTaken/60)}m ${r.timeTaken%60}s` : 'Unknown',
        status: 'Completed',
        raw: r // Store raw response for the modal
      };
    });
    
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();
    
    const counts = last7Days.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
    filteredData.forEach(r => {
      const day = new Date(r.completedAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (counts[day] !== undefined) counts[day]++;
    });
    
    const growth = last7Days.map(day => ({ name: day, responses: counts[day] }));
    
    const completion = [
      { name: 'Completed', value: filteredData.length },
      { name: 'Dropped', value: 0 }
    ];

    setAnalyticsData({
      growthData: growth,
      completionData: completion,
      recentResponses: recent
    });
  }, [allResponses, selectedSurvey]);

  if (loading) return <div className="text-slate-500">Loading analytics...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  const { growthData, completionData, recentResponses } = analyticsData;

  const exportResponseToCSV = () => {
    if (!selectedResponse || !selectedResponse.raw) return;
    
    const headers = ['Question', 'Answer'];
    const rows = [];
    const questions = selectedResponse.raw?.surveyId?.questions || [];
    
    selectedResponse.raw.answers?.forEach((ans, idx) => {
      const questionObj = questions.find(q => q.id === ans.questionId);
      const questionText = questionObj ? (questionObj.questionText || questionObj.title) : `Question ${idx + 1}`;
      
      let answerText = '';
      if (typeof ans.answer === 'object' && ans.answer !== null) {
        answerText = Object.entries(ans.answer).map(([k, v]) => `${k}: ${v}`).join('; ');
      } else {
        answerText = String(ans.answer);
      }
      
      const escapedQuestion = `"${questionText.replace(/"/g, '""')}"`;
      const escapedAnswer = `"${answerText.replace(/"/g, '""')}"`;
      
      rows.push([escapedQuestion, escapedAnswer].join(','));
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedResponse.name.replace(/\\s+/g, '_')}_response.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics & Responses</h1>
          <p className="text-slate-400 text-sm">Analyze survey performance and manage individual responses.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 shadow-sm min-w-[200px]"
          >
            <option value="all">All Surveys</option>
            {surveys.map(s => (
              <option key={s._id} value={s._id}>{s.surveyCode ? `${s.surveyCode} - ` : ''}{s.title}</option>
            ))}
          </select>
          <div className="flex gap-2 bg-white/60 p-1 rounded-xl">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-800'}`}>Overview</button>
            <button onClick={() => setActiveTab('responses')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'responses' ? 'bg-indigo-600 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-800'}`}>Responses</button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Growth Chart */}
            <div className="lg:col-span-2 glass p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Response Growth (This Week)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                    <Line type="monotone" dataKey="responses" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#1e293b'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rate Pie */}
            <div className="glass p-6 rounded-2xl flex flex-col">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Completion Rate</h3>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {completionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="text-slate-700">0% Completed</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500"></div><span className="text-slate-700">0% Dropped</span></div>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {activeTab === 'responses' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search responses..." className="w-full pl-10 pr-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <button className="p-2 border border-slate-200 bg-white/60 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"><Filter size={20} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">Respondent</th>
                  <th className="p-4 font-medium">Survey</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Time Taken</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentResponses.map(res => (
                  <tr key={res.id} className="border-b border-slate-200 hover:bg-white/40 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{res.name}</p>
                      <p className="text-xs text-slate-400">{res.email}</p>
                    </td>
                    <td className="p-4 text-slate-700">{res.survey}</td>
                    <td className="p-4 text-slate-400 text-sm">{res.date}</td>
                    <td className="p-4 text-slate-400 text-sm">{res.time}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${res.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedResponse(res)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-200 rounded-lg transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleDeleteResponse(res.id)} className="p-1.5 text-slate-400 hover:text-red-400 bg-white hover:bg-slate-200 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedResponse.name}'s Response</h3>
                <p className="text-slate-500 text-sm mt-1">{selectedResponse.survey} • {selectedResponse.date} • Time: {selectedResponse.time}</p>
              </div>
              <button onClick={() => setSelectedResponse(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {selectedResponse.raw?.answers?.map((ans, idx) => {
                // Find the original question text if available
                const questions = selectedResponse.raw?.surveyId?.questions || [];
                const questionObj = questions.find(q => q.id === ans.questionId);
                const questionText = questionObj ? (questionObj.questionText || questionObj.title) : `Question ${idx + 1}`;
                
                return (
                  <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-800 mb-3">{idx + 1}. {questionText}</p>
                    <div className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                      {typeof ans.answer === 'object' && ans.answer !== null ? (
                        <ul className="list-disc pl-5">
                          {Object.entries(ans.answer).map(([k, v]) => (
                            <li key={k}><span className="font-medium">{k}:</span> {v}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{String(ans.answer)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!selectedResponse.raw?.answers || selectedResponse.raw.answers.length === 0) && (
                <div className="text-center text-slate-500 py-8">No answers recorded for this response.</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button onClick={exportResponseToCSV} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-200 text-slate-800 rounded-xl font-medium transition-colors border border-slate-300">
                <Download size={18} /> Export CSV
              </button>
              <button onClick={() => setSelectedResponse(null)} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
