import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, GripVertical, Settings2, Trash2, FileSpreadsheet, Download, Loader2, Palette, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ThemeBuilder from './ThemeBuilder';

const SurveyBuilder = () => {
  const [surveyId, setSurveyId] = useState(null);
  const [title, setTitle] = useState('Untitled Survey');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([
    { id: '1', type: 'text', title: 'What is your name?', required: true },
  ]);
  const [activeTab, setActiveTab] = useState('build');
  const [theme, setTheme] = useState({
    primaryColor: '#6366f1',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter',
    isLight: true,
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=SurveySphere&backgroundColor=6366f1',
    layout: 'centered',
    buttonStyle: 'pill',
    progressStyle: 'bar',
    animationStyle: 'slide',
  });
  const [landing, setLanding] = useState({
    showEstimatedTime: true,
    estimatedTimeText: '3 mins',
    showQuestionCount: true,
    buttonText: 'Begin Survey',
    timeLimit: 0,
  });
  
  const { id } = useParams();
  
  useEffect(() => {
    if (id) {
      // Edit mode: fetch existing survey
      const fetchSurvey = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setSurveyId(data._id);
            setTitle(data.title);
            if (data.questions && data.questions.length > 0) setQuestions(data.questions);
            if (data.theme) setTheme(data.theme);
            if (data.settings) setLanding(data.settings);
          }
        } catch (err) {
          console.error('Failed to fetch survey', err);
        }
      };
      fetchSurvey();
    } else if (!surveyId) {
      // Create mode: fetch global theme
      const fetchGlobalTheme = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/auth/theme`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.theme && Object.keys(data.theme).length > 0) setTheme(data.theme);
            if (data.settings && Object.keys(data.settings).length > 0) setLanding(data.settings);
          }
        } catch (err) {
          console.error('Failed to fetch global theme', err);
        }
      };
      fetchGlobalTheme();
    }
  }, [id, surveyId]);
  
  const fileInputRef = useRef(null);

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now().toString(), type: 'text', title: 'New Question', required: false }]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const toggleRequired = (id) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, required: !q.required } : q));
  };

  const updateQuestion = (id, key, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length <= 1) {
           alert("File seems empty or has no data rows.");
           return;
        }

        const rows = jsonData.slice(1);
        
        const newQuestions = rows.map((row, idx) => {
          const title = row[0] ? String(row[0]) : '';
          if (!title) return null;

          const typeRaw = row[1] ? String(row[1]).toLowerCase() : 'text';
          let type = 'text';
          if (typeRaw.includes('multi')) type = 'multiple';
          else if (typeRaw.includes('rating')) type = 'rating';
          else if (typeRaw.includes('long')) type = 'longtext';
          
          const reqVal = row[2] ? String(row[2]).toLowerCase() : 'false';
          const required = (reqVal === 'yes' || reqVal === 'true' || reqVal === '1');
          
          const options = [];
          for (let i = 3; i < row.length; i++) {
            if (row[i]) options.push(String(row[i]));
          }

          return {
            id: Date.now().toString() + idx,
            type,
            title,
            required,
            options: (type === 'multiple' && options.length === 0) ? ['Option 1', 'Option 2'] : options
          };
        }).filter(Boolean);

        if (newQuestions.length > 0) {
          setQuestions([...questions, ...newQuestions]);
          alert(`Successfully imported ${newQuestions.length} questions from Excel!`);
        } else {
          alert("No valid questions found in the file.");
        }
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please ensure it's a valid Excel or CSV.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null; 
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Question Title', 'Type (text/multiple/rating/longtext)', 'Required (yes/no)', 'Option 1', 'Option 2', 'Option 3', 'Option 4'],
      ['How did you hear about us?', 'multiple', 'yes', 'Social Media', 'Friend', 'Search Engine', 'Other'],
      ['Rate your overall experience', 'rating', 'yes', '', '', '', ''],
      ['Do you have any extra feedback?', 'longtext', 'no', '', '', '', '']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SurveyTemplate");
    XLSX.writeFile(wb, "Survey_Import_Template.xlsx");
  };

  const saveSurvey = async (status) => {
    if (status === 'Published' && questions.length === 0) {
      alert('Please add some questions before publishing.');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { title, questions, status, theme, settings: landing };
      const url = surveyId ? `${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys/${surveyId}` : `${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/surveys`;
      const method = surveyId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSurveyId(data._id);
        alert(`Survey ${status === 'Draft' ? 'Draft Saved' : 'Published'} successfully! Code: ${data.surveyCode}`);
        if (status === 'Published') {
           navigate('/admin/surveys');
        }
      } else {
        alert(data.message || 'Error saving survey');
      }
    } catch (err) {
      alert('Server error while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    const previewData = { title, questions, theme, landingPage: landing, settings: {} };
    localStorage.setItem('surveyPreview', JSON.stringify(previewData));
    navigate('/s/preview');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20 backdrop-blur-xl border border-slate-200">
        <div>
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none text-slate-900 focus:ring-2 focus:ring-indigo-500/50 rounded-lg px-2 py-1 -ml-2"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={handlePreview} className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 glass rounded-xl transition-colors border border-slate-200 shadow-sm disabled:opacity-50" disabled={isSaving}>
            Preview
          </button>
          <button onClick={() => saveSurvey('Draft')} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg transition-all disabled:opacity-70">
            {isSaving && <Loader2 size={16} className="animate-spin" />} Save Draft
          </button>
          <button onClick={() => saveSurvey('Published')} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-70">
            {isSaving && <Loader2 size={16} className="animate-spin" />} Publish
          </button>
        </div>
      </div>

      {activeTab === 'theme' ? (
        <>
          <button onClick={() => setActiveTab('build')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-6 transition-colors">
            <ArrowLeft size={18} /> Back to Questions
          </button>
          <ThemeBuilder theme={theme} setTheme={setTheme} />
        </>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl gap-4">
              <div>
                <h3 className="text-sm font-semibold text-indigo-900">Bulk Import Questions</h3>
                <p className="text-xs text-indigo-700 mt-1">Upload an Excel or CSV file to instantly build your survey.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <Download size={14} /> Template
                </button>
                <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                  <FileSpreadsheet size={16} /> Import
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-purple-50 border border-purple-100 p-4 rounded-2xl gap-4">
              <div>
                <h3 className="text-sm font-semibold text-purple-900">Survey Theme</h3>
                <p className="text-xs text-purple-700 mt-1">Customize the look and feel of your survey.</p>
              </div>
              <button onClick={() => setActiveTab('theme')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors whitespace-nowrap">
                <Palette size={16} /> Add theme for this survey
              </button>
            </div>
          </div>

      <div 
        className="space-y-4 p-6 md:p-8 rounded-3xl transition-all duration-500 relative overflow-hidden shadow-sm border border-slate-200 mt-8"
        style={{
          backgroundColor: theme.backgroundColor || '#f8fafc',
          backgroundImage: theme.backgroundImage ? `url("${theme.backgroundImage}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: theme.fontFamily || 'Inter'
        }}
      >
        <div className={`absolute inset-0 w-full h-full ${theme.isLight ? 'bg-white/30' : 'bg-black/60'} backdrop-blur-sm`}></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${theme.isLight ? 'text-slate-800' : 'text-white'}`}>Live Theme Preview</h2>
          </div>

          {questions.map((q, index) => {
            const inputClass = theme.isLight 
              ? "bg-white border-slate-200 text-slate-800 focus:border-indigo-500" 
              : "bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-indigo-400";
              
            return (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl group flex gap-4 border transition-colors ${theme.isLight ? 'bg-white/90 border-slate-200 backdrop-blur-md' : 'bg-black/40 border-white/10 backdrop-blur-md'}`}
              >
                <div className={`mt-2 cursor-grab active:cursor-grabbing transition-colors ${theme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input 
                      type="text" 
                      value={q.title} 
                      onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
                      className={`flex-1 border rounded-xl px-4 py-2.5 outline-none transition-colors text-lg ${inputClass}`}
                      placeholder="Question title"
                    />
                    <select 
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                      className={`border rounded-xl px-4 py-2.5 outline-none md:w-48 ${inputClass}`}
                    >
                  <option value="text">Short Text</option>
                  <option value="longtext">Long Text</option>
                  <option value="multiple">Multiple Choice</option>
                  <option value="rating">Rating</option>
                </select>
              </div>

              {q.type === 'multiple' && (
                <div className="pl-2 space-y-2">
                  <p className="text-xs text-slate-500 font-medium mb-2">Options</p>
                  {q.options?.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className={`w-4 h-4 rounded-full border-2 ${theme.isLight ? 'border-slate-300' : 'border-white/30'}`}></div>
                      <input 
                        type="text" 
                        value={opt} 
                        onChange={(e) => {
                          const newOpts = [...(q.options || [])];
                          newOpts[i] = e.target.value;
                          updateQuestion(q.id, 'options', newOpts);
                        }}
                        className={`border rounded-md px-3 py-1.5 text-sm outline-none w-full md:w-1/2 ${inputClass}`} 
                      />
                      <button onClick={() => {
                        const newOpts = q.options.filter((_, idx) => idx !== i);
                        updateQuestion(q.id, 'options', newOpts);
                      }} className="text-red-400 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => updateQuestion(q.id, 'options', [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`])} className="text-xs text-indigo-600 font-medium hover:underline mt-2">
                    + Add Option
                  </button>
                </div>
              )}

              {q.type !== 'multiple' && (
                <div className="pl-2 border-l-2 border-slate-200 text-slate-400 text-sm py-2">
                  {q.type === 'rating' ? 'Rating scale (1-5) will be shown' : 'Respondent will enter text here'}
                </div>
              )}
              </div>
              <div className="flex flex-col justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={20} />
                </button>
                <div className="flex items-center gap-2 mt-4">
                  <span className={`text-sm font-medium ${theme.isLight ? 'text-slate-500' : 'text-slate-300'}`}>Required</span>
                  <div 
                    onClick={() => toggleRequired(q.id)}
                    className={`w-12 h-6 rounded-full cursor-pointer p-1 transition-colors ${q.required ? (theme.primaryColor ? 'bg-indigo-500' : 'bg-indigo-500') : (theme.isLight ? 'bg-slate-300' : 'bg-white/20')}`}
                    style={q.required ? { backgroundColor: theme.primaryColor || '#6366f1' } : {}}
                  >
                    <motion.div 
                      layout
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: q.required ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>

      <button 
        onClick={addQuestion}
        className="w-full py-4 glass bg-white/50 border-dashed border-2 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center gap-2 text-slate-500 transition-all duration-300 font-medium shadow-sm"
      >
        <Plus size={20} />
        Add Question
      </button>
      </>
      )}
    </div>
  );
};

export default SurveyBuilder;
