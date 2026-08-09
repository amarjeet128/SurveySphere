import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Lock, Eye, EyeOff } from 'lucide-react';

const AdminSettings = () => {
  const [email, setEmail] = useState(JSON.parse(localStorage.getItem('userInfo'))?.email || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Credentials updated successfully!');
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        userInfo.email = data.email;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      } else {
        setMessage(data.message || 'Failed to update credentials.');
      }
    } catch (err) {
      setMessage('Server error. Try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Account Settings</h1>
        <p className="text-slate-500 text-sm">Update your admin credentials securely.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 rounded-2xl border border-slate-200">
        {message && (
          <div className={`p-4 mb-6 rounded-xl text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <User size={16} /> Admin Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Lock size={16} /> New Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 transition-colors"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/25">
              <Save size={18} /> Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminSettings;
