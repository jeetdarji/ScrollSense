import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

export default function DashboardNav() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore(state => state.user);
  const clearUser = useAuthStore(state => state.clearUser);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    clearUser();
    localStorage.removeItem('scrollsense_user');
    navigate('/login');
  };

  const navLinks = [
    { name: 'DASHBOARD', path: '/dashboard' },
    { name: 'PATTERNS', path: '/patterns' },
    { name: 'PROGRESS', path: '/progress' },
    { name: 'COMMUNITY', path: '/community' },
    { name: 'SETTINGS', path: '/settings' }
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-[56px] bg-[#09090B] border-b border-[#3F3F46] z-50 font-space">
        <div className="max-w-[95vw] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* LEFT: Logo */}
          <Link 
            to="/" 
            className="font-bold uppercase tracking-tighter text-sm text-[#FAFAFA] hover:text-[#DFE104] transition-colors duration-200"
          >
            SCROLLSENSE
          </Link>

          {/* CENTER: Desktop Nav */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `text-xs uppercase tracking-widest px-4 py-1.5 transition-colors duration-200 ${
                    isActive 
                      ? 'text-[#FAFAFA] border-b-2 border-[#DFE104] pb-0' 
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* RIGHT: Notifications & Avatar */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
              <Bell size={18} />
            </button>
            <div 
              className="hidden md:block relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="w-[32px] h-[32px] border-2 border-[#3F3F46] bg-[#27272A] flex items-center justify-center cursor-pointer hover:border-[#DFE104]/50 transition-colors duration-200 rounded-none">
                <span className="text-xs font-bold text-[#FAFAFA] uppercase">{initials}</span>
              </div>
              
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+8px)] right-0 z-[100] max-w-[200px]"
                  >
                    <div className="bg-[#27272A] border border-[#3F3F46] px-3 py-2 whitespace-nowrap flex flex-col gap-1 rounded-none shadow-none">
                      {user?.name && (
                        <span className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                          {user.name}
                        </span>
                      )}
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider overflow-hidden text-ellipsis">
                        {user?.email || 'No email set'}
                      </span>
                      <div className="border-t border-[#3F3F46] my-1" />
                      <span 
                        onClick={handleSignOut}
                        className="text-[10px] uppercase tracking-widest text-[#3F3F46] hover:text-[#A1A1AA] cursor-pointer transition-colors"
                      >
                        SIGN OUT
                      </span>
                    </div>
                    <div className="absolute top-[-4px] right-[12px] w-2 h-2 bg-[#27272A] border-l border-t border-[#3F3F46] transform rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Mobile Hamburger */}
            <button 
              className="md:hidden p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-[99]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: 240 }}
              animate={{ x: 0 }}
              exit={{ x: 240 }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-full w-[240px] bg-[#09090B] border-l-2 border-[#3F3F46] z-[100] pt-16 px-6 font-space"
            >
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `py-4 border-b border-[#3F3F46] text-sm uppercase tracking-widest ${
                        isActive ? 'text-[#DFE104]' : 'text-[#A1A1AA]'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
                
                <div className="py-4 mt-8 border-t border-[#3F3F46] flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[32px] h-[32px] border-2 border-[#3F3F46] bg-[#27272A] flex items-center justify-center rounded-none">
                      <span className="text-xs font-bold text-[#FAFAFA] uppercase">{initials}</span>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-[#FAFAFA] truncate">{user?.name || 'User'}</span>
                       <span className="text-[8px] text-[#A1A1AA] uppercase tracking-wider truncate">{user?.email || 'No email set'}</span>
                    </div>
                  </div>
                  <button onClick={handleSignOut} className="text-left text-sm uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
                    LOG OUT
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
