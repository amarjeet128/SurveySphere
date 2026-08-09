import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Play, Square, BarChart2, CheckCircle2, FileText, Trash2, Eye, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const SurveysList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/surveys', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSurveys(data);
        } else {
          setSurveys([]); // Clear if unauthorized or error
        }
      } catch (err) {
        setSurveys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/surveys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setSurveys(surveys.map(s => s._id === id ? { ...s, status: updated.status, surveyCode: updated.surveyCode } : s));
      } else {
        const errData = await res.json();
        alert(`Failed to update status: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status: Network error');
    }
  };

  const deleteSurvey = async (id) => {
    if (!window.confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/surveys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSurveys(surveys.filter(s => s._id !== id));
      } else {
        const errData = await res.json();
        alert(`Failed to delete survey: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete survey', err);
      alert('Failed to delete survey: Network error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">My Surveys</h1>
          <p className="text-slate-500 text-sm">Manage, share, and analyze all your created surveys.</p>
        </div>
        <Link to="/admin/surveys/new" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
          <Plus size={18} /> Create Survey
        </Link>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search surveys..." 
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
                <th className="p-4 font-medium rounded-tl-xl">Survey Name</th>
                <th className="p-4 font-medium">Survey Code</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Responses</th>
                <th className="p-4 font-medium">Completion Rate</th>
                <th className="p-4 font-medium">Date Modified</th>
                <th className="p-4 font-medium text-center rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    Loading surveys...
                  </td>
                </tr>
              ) : surveys.filter(s => (s.title || '').toLowerCase().includes(search.toLowerCase())).map((survey, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={survey._id} 
                  className="border-b border-slate-100 hover:bg-white transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        survey.status === 'Active' ? 'bg-emerald-100 text-emerald-600' :
                        survey.status === 'Closed' ? 'bg-red-100 text-red-600' :
                        survey.status === 'Draft' ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col">
                        <Link to={`/admin/surveys/new`} className="font-medium text-slate-800 hover:text-indigo-600 transition-colors">{survey.title}</Link>
                        <span className={`text-[10px] uppercase tracking-wider font-bold mt-1 w-max px-2 py-0.5 rounded-full ${survey.type === 'live' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {survey.type === 'live' ? 'Live Poll' : 'Survey'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-mono text-indigo-600 font-bold text-sm bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 whitespace-nowrap">
                      {survey.surveyCode || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      survey.status === 'Active' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                      survey.status === 'Published' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                      survey.status === 'Closed' ? 'bg-red-100 text-red-600 border border-red-200' :
                      survey.status === 'Draft' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {survey.status || 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{survey.responseCount || 0}</td>
                  <td className="p-4 text-slate-600">{survey.responseCount > 0 ? '100%' : '-'}</td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(survey.updatedAt || survey.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      {survey.status === 'Draft' && (
                        <button onClick={() => updateStatus(survey._id, 'Published')} className="p-2 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-lg transition-all shadow-sm" title="Publish">
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      {(survey.status === 'Published' || survey.status === 'Closed' || survey.status === 'Draft') && survey.status !== 'Active' && (
                        <button onClick={() => updateStatus(survey._id, 'Active')} className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 rounded-lg transition-all shadow-sm" title="Start">
                          <Play size={16} />
                        </button>
                      )}
                      {survey.status === 'Active' && (
                        <button onClick={() => updateStatus(survey._id, 'Closed')} className="p-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-lg transition-all shadow-sm" title="End">
                          <Square size={16} />
                        </button>
                      )}
                      <button onClick={() => navigate(`/admin/analytics?survey=${survey._id}`)} className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded-lg transition-all shadow-sm" title="See Analytics">
                        <BarChart2 size={16} />
                      </button>
                      {survey.status !== 'Active' && (
                        <button onClick={() => navigate(`/admin/surveys/edit/${survey._id}`)} className="p-2 text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-lg transition-all shadow-sm" title="Edit Survey">
                          <Pencil size={16} />
                        </button>
                      )}
                      <button onClick={() => { if (survey.surveyCode) { window.open(`/s/${survey.surveyCode}?preview=true`, '_blank'); } else { alert('Survey is not published yet.'); } }} className="p-2 text-slate-600 hover:text-white bg-slate-50 hover:bg-slate-600 border border-slate-200 rounded-lg transition-all shadow-sm" title="Preview">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => deleteSurvey(survey._id)} className="p-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-lg transition-all shadow-sm" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && surveys.filter(s => (s.title || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No surveys found matching your search. Try creating a new one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SurveysList;
