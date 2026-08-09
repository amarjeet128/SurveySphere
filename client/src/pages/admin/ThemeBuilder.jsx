import React, { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';

const PREDEFINED_THEMES = [
  { id: 'heritage', name: 'Heritage', bgImage: 'https://images.unsplash.com/photo-1594122230687-8581023a1a0e?q=80&w=1000', bgColor: '#166534', primaryColor: '#22c55e', font: 'Inter' },
  { id: 'simple', name: 'Simple', bgImage: '', bgColor: '#ffffff', primaryColor: '#22c55e', font: 'Inter', isLight: true },
  { id: 'full-color', name: 'Full Color', bgImage: '', bgColor: '#0284c7', primaryColor: '#ffffff', font: 'Inter' },
  { id: 'highrise', name: 'Highrise', bgImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000', bgColor: '#312e81', primaryColor: '#6366f1', font: 'Inter' },
  { id: 'dewdrop', name: 'Dewdrop', bgImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000', bgColor: '#064e3b', primaryColor: '#10b981', font: 'Inter' },
  { id: 'pastel', name: 'Pastel', bgImage: '', bgColor: '#bde0fe', primaryColor: '#ffafcc', font: 'Inter', isLight: true },
  { id: 'walnut', name: 'Walnut', bgImage: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?q=80&w=1000', bgColor: '#78350f', primaryColor: '#d97706', font: 'Lora' },
  { id: 'stone', name: 'Stone', bgImage: 'https://images.unsplash.com/photo-1500322969630-a26ab6eb64cc?q=80&w=1000', bgColor: '#334155', primaryColor: '#64748b', font: 'Inter' },
  { id: 'porch-lights', name: 'Porch Lights', bgImage: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=1000', bgColor: '#713f12', primaryColor: '#eab308', font: 'Inter' },
  { id: 'scribble', name: 'Scribble', bgImage: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?q=80&w=1000', bgColor: '#1e293b', primaryColor: '#64748b', font: 'Caveat' },
  { id: 'arctic', name: 'Arctic', bgImage: 'https://images.unsplash.com/photo-1418065460487-3e41a6c8e1e4?q=80&w=1000', bgColor: '#0c4a6e', primaryColor: '#0ea5e9', font: 'Inter' }
];

const ThemeBuilder = ({ theme, setTheme }) => {
  const fileInputRef = useRef(null);

  const applyTheme = (preset) => {
    setTheme({
      ...theme,
      themeId: preset.id,
      backgroundImage: preset.bgImage,
      backgroundColor: preset.bgColor || '#0f172a',
      primaryColor: preset.primaryColor,
      fontFamily: preset.font,
      isLight: preset.isLight || false,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // We will resize the image to a max width of 1920 to keep base64 size manageable
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Use jpeg for compression
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        setTheme({
          ...theme,
          themeId: 'custom-upload',
          backgroundImage: dataUrl,
          backgroundColor: '#000000', // Default dark fallback
          isLight: false
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      // Create a smaller version of the logo
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
        setTheme({
          ...theme,
          logoUrl: dataUrl
        });
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

  const setAsGlobalDefault = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        theme: theme
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://surveysphere-backend-boib.onrender.com'}/api/auth/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Theme set as global default successfully!');
      } else {
        alert('Failed to set global theme.');
      }
    } catch (err) {
      console.error(err);
      alert('Error setting global theme.');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Select a Theme</h2>
          <p className="text-sm text-slate-500">Choose a beautiful background for your survey.</p>
        </div>
        <button 
          onClick={setAsGlobalDefault}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Set as Default Theme
        </button>
      </div>

      {/* Custom Image Upload */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <ImageIcon size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900">Custom Background</h3>
            <p className="text-sm text-indigo-700">Upload your own image to create a custom theme.</p>
          </div>
        </div>
        <div>
        <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
          />
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

      {/* Theme Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {PREDEFINED_THEMES.map((preset) => {
          const isSelected = theme.themeId === preset.id;
          return (
            <div 
              key={preset.id} 
              onClick={() => applyTheme(preset)}
              className={`cursor-pointer group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isSelected ? 'border-indigo-600 shadow-lg shadow-indigo-200 scale-105' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              {/* Thumbnail */}
              <div 
                className="h-32 w-full bg-cover bg-center flex items-center justify-center relative"
                style={{
                  backgroundImage: preset.bgImage ? `url("${preset.bgImage}")` : 'none',
                  backgroundColor: preset.bgColor
                }}
              >
                {/* Mock Survey Content for Thumbnail */}
                <div className={`w-3/4 h-16 rounded-lg shadow-sm border ${preset.isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/20 backdrop-blur-sm'} p-2 flex flex-col gap-2`}>
                  <div className={`w-1/2 h-2 rounded ${preset.isLight ? 'bg-slate-200' : 'bg-white/40'}`}></div>
                  <div className={`w-full h-2 rounded ${preset.isLight ? 'bg-slate-100' : 'bg-white/20'}`}></div>
                  <div className={`w-full h-2 rounded ${preset.isLight ? 'bg-slate-100' : 'bg-white/20'}`}></div>
                </div>
              </div>
              
              <div className="p-3 bg-white flex items-center justify-between">
                <span className="font-medium text-slate-800 text-sm">{preset.name}</span>
                {isSelected && (
                  <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Advanced Aesthetics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Advanced Aesthetics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Progress Indicator Style</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              value={theme.progressStyle || 'bar'}
              onChange={(e) => setTheme({...theme, progressStyle: e.target.value})}
            >
              <option value="bar">Thin Line (Classic)</option>
              <option value="stacks">Stacked Boxes</option>
              <option value="cartoon">Animated Rocket</option>
              <option value="circle">Radial Ring</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Typography (Font Family)</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              value={theme.fontFamily || 'Inter'}
              onChange={(e) => setTheme({...theme, fontFamily: e.target.value})}
            >
              <option value="Inter">Inter (Clean & Modern)</option>
              <option value="Lora">Lora (Elegant Serif)</option>
              <option value="Caveat">Caveat (Playful Handwriting)</option>
              <option value="Outfit">Outfit (Bold & Geometric)</option>
              <option value="Roboto Mono">Roboto Mono (Tech / Code)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeBuilder;
