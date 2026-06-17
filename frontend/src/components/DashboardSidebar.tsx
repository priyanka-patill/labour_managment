"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logout, toggleTheme, setLanguage } from '../store/authSlice';
import { getTranslation } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, PlusCircle, Briefcase, Users, Search, 
  MessageSquare, Bell, Wallet, Clock, Star, Settings, ShieldAlert,
  LogOut, Sun, Moon, Languages, Menu, X
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
  notificationsCount?: number;
  walletBalance?: number;
}

export function DashboardSidebar({ activeSection, setActiveSection, notificationsCount = 0, walletBalance = 0 }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user, theme, language } = useSelector((state: RootState) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);

  const t = (key: any) => getTranslation(key, language);

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : language === 'hi' ? 'mr' : 'en';
    dispatch(setLanguage(nextLang));
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  if (!user) return null;

  // Determine navigation menu list based on user role
  const getNavItems = () => {
    const common = [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'search-workers', label: 'Search Workers', icon: Search },
      { id: 'service-requests', label: 'Service Requests', icon: PlusCircle },
      { id: 'chat', label: 'Messenger', icon: MessageSquare },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationsCount },
      { id: 'wallet', label: 'Wallet', icon: Wallet, extra: `Rs. ${walletBalance}` },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const employer = [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'post-job', label: 'Post a Job', icon: PlusCircle },
      { id: 'jobs-manager', label: 'Manage Jobs', icon: Briefcase },
      { id: 'chat', label: 'Messenger', icon: MessageSquare },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationsCount },
      { id: 'wallet', label: 'Wallet', icon: Wallet, extra: `Rs. ${walletBalance}` },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const labour = [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'job-feed', label: 'Recommended Jobs', icon: Briefcase },
      { id: 'applications', label: 'My Applications', icon: PlusCircle },
      { id: 'attendance', label: 'QR Attendance', icon: Clock },
      { id: 'chat', label: 'Messenger', icon: MessageSquare },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationsCount },
      { id: 'wallet', label: 'Wallet', icon: Wallet, extra: `Rs. ${walletBalance}` },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (user.role === 'admin') {
      return [
        { id: 'overview', label: 'Admin Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'Messenger', icon: MessageSquare },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    return user.role === 'employer' ? employer : user.role === 'labour' ? labour : common;
  };

  const navItems = getNavItems();

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between py-6 px-4">
      {/* Brand & User Profile */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span className="font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            SHRAMIK
          </span>
        </div>

        {/* User Card */}
        <div className="glass-panel p-4 rounded-xl border border-zinc-800 flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500/10 rounded-full blur-md"></div>
          <img 
            src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} 
            alt="avatar" 
            className="w-10 h-10 rounded-full bg-zinc-850 object-cover border border-zinc-700"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs text-zinc-100 truncate leading-none">{user.name}</h4>
              {user.isVerified && (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] text-white font-extrabold shadow-sm" title="Verified Professional">
                  ✓
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 capitalize mt-1 tracking-wider">{user.role} Account</p>
            <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-md w-fit">
              <Star size={8} fill="currentColor" /> Trust Score: {user.trustScore || 80}%
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${activeSection === item.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800'}`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={16} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[9px] font-bold px-1.5 py-0.5 min-w-[16px] text-center">
                  {item.badge}
                </span>
              )}
              {item.extra && (
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                  {item.extra}
                </span>
              )}
            </button>
          ))}

          {/* Quick link back to admin dashboard if logged-in user is admin */}
          {user.role !== 'admin' && user.email === 'admin@shramik.com' && (
            <button
              onClick={() => { router.push('/dashboard/admin'); }}
              className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <ShieldAlert size={16} />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/60">
        <div className="flex items-center justify-start gap-2 px-2">
          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-50 px-2.5 py-1.5 rounded-md border border-zinc-800 text-[10px] font-bold cursor-pointer transition"
          >
            <Languages size={12} />
            <span className="uppercase">{language}</span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition duration-150 cursor-pointer"
        >
          <LogOut size={16} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 bg-zinc-950 border-r border-zinc-700 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Trigger */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-700 sticky top-0 z-40">
        <div className="flex items-center gap-2" onClick={() => router.push('/')}>
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            S
          </div>
          <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            SHRAMIK
          </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 border border-zinc-700 text-zinc-350 rounded-lg">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Overlay backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)}></div>
            
            {/* Sidebar drawer content */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-64 bg-zinc-950 border-r border-zinc-700 h-full z-10"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
export default DashboardSidebar;
