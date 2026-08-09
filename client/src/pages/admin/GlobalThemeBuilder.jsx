import React, { useState, useEffect, useRef } from 'react';
import ThemeBuilder from './ThemeBuilder';
import { CheckCircle, Loader2, ImageIcon, Upload } from 'lucide-react';

const defaultTheme = {
  primaryColor: '#6366f1',
  backgroundColor: '#f8fafc',
  fontFamily: 'Inter',
  isLight: true,
  logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=SurveySphere&backgroundColor=6366f1',
  layout: 'centered',
  buttonStyle: 'pill',
  progressStyle: 'bar',
  animationStyle: 'slide',
};

const defaultLanding = {
  showEstimatedTime: true,
  estimatedTimeText: '3 mins',
  showQuestionCount: true,
  buttonText: 'Begin Survey',
  timeLimit: 0,
};

const GlobalThemeBuilder = () => {
  const [theme, setTheme] = useState(defaultTheme);
  const [landing, setLanding] = useState(defaultLanding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchGlobalTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/auth/theme', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.theme && Object.keys(data.theme).length > 0) {
            setTheme(data.theme);
          }
          if (data.settings && Object.keys(data.settings).length > 0) {
            setLanding(data.settings);
          }
        }
      } catch (err) {
        console.error('Failed to fetch global theme:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGlobalTheme();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        setTheme(prev => ({
          ...prev,
          logoUrl: dataUrl
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = (e, target) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (target === 'background') {
          handleImageUpload({ target: { files: [file] } });
        } else if (target === 'logo') {
          handleLogoUpload({ target: { files: [file] } });
        }
        return;
      }
    }
  };

  const handleSaveGlobalTheme = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/users/theme', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ theme, settings: landing })
      });
      if (res.ok) {
        alert('Global Theme Saved Successfully! New surveys will use this theme by default.');
      } else {
        alert('Failed to save global theme.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving global theme.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Global Theme Default</h2>
          <p className="text-sm text-slate-500">Configure the default theme that will be applied when you create new surveys.</p>
        </div>
        <button 
          onClick={handleSaveGlobalTheme} 
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Save Global Default
        </button>
      </div>
      
      {/* Custom Logo Upload */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <ImageIcon size={24} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Custom Logo</h3>
            <p className="text-sm text-slate-500">Upload your brand logo (PNG or JPG).</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <input 
            type="text" 
            placeholder="Paste logo URL or Ctrl+V image..." 
            className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
            value={theme.logoUrl && theme.logoUrl.startsWith('http') ? theme.logoUrl : ''} 
            onChange={(e) => setTheme({...theme, logoUrl: e.target.value})} 
            onPaste={(e) => handlePasteImage(e, 'logo')}
          />
          <span className="text-slate-400 text-sm hidden sm:inline">or</span>
          <input 
            id="logo-upload"
            type="file" 
            accept="image/*" 
            onChange={handleLogoUpload} 
            className="hidden" 
          />
          <label 
            htmlFor="logo-upload"
            className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload size={18} /> Upload Logo
          </label>
        </div>
      </div>
      
      {/* Custom Background Upload */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-semibold text-slate-900">Background Image</h3>
          <p className="text-sm text-slate-500">Set a custom background image for your survey.</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Paste image URL or Ctrl+V image..." 
            className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
            value={theme.backgroundImage && theme.backgroundImage.startsWith('http') ? theme.backgroundImage : ''} 
            onChange={(e) => setTheme({...theme, backgroundImage: e.target.value, themeId: 'custom'})} 
            onPaste={(e) => handlePasteImage(e, 'background')}
          />
          <span className="text-slate-400 text-sm hidden sm:inline">or</span>
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium transition-colors"
          >
            <Upload size={18} /> Upload Image
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {theme && landing && (
          <ThemeBuilder theme={theme} setTheme={setTheme} landing={landing} setLanding={setLanding} />
        )}
      </div>
    </div>
  );
};

export default GlobalThemeBuilder;
