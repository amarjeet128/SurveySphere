import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, Bell, BarChart2, Radio, Palette } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo')) || { name: 'Admin User', email: 'admin@surveysphere.com' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Surveys', path: '/admin/surveys', icon: <FileText size={20} /> },
    { name: 'Theme', path: '/admin/theme', icon: <Palette size={20} /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart2 size={20} /> },
    { name: 'Live Polls', path: '/admin/live', icon: <Radio size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 glass m-4 rounded-2xl flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-slate-900 shadow-lg">
              S
            </div>
            <h1 className="text-xl font-bold gradient-text tracking-wide">SurveySphere</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-indigo-500/20 text-indigo-600 font-medium border border-indigo-500/30' 
                      : 'text-slate-400 hover:bg-white/60 hover:text-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 py-4 m-4 ml-0 glass rounded-2xl">
          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find((i) => i.path === location.pathname)?.name || 'Admin Panel'}
          </h2>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{userInfo.name || 'Admin User'}</p>
                <p className="text-xs text-slate-400">{userInfo.email || 'admin@surveysphere.com'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-indigo-500/50 flex items-center justify-center font-bold text-sm">
                AU
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-hide">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
