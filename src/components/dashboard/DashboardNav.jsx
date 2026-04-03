import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardNav() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = [
    { name: 'DASHBOARD', path: '/dashboard' },
    { name: 'PATTERNS', path: '/patterns' },
    { name: 'PROGRESS', path: '/progress' },
    { name: 'COMMUNITY', path: '/community' },
    { name: 'SETTINGS', path: '/settings' }
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-[56px] bg-[#09090B] border-b border-[#3F3F46] z-50">
        <div className="max-w-[95vw] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* LEFT: Logo */}
          <Link 
            to="/dashboard" 
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
            <div className="hidden md:flex w-[32px] h-[32px] border-2 border-[#3F3F46] bg-[#27272A] items-center justify-center text-xs font-bold text-[#FAFAFA] uppercase">
              U
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
              className="fixed top-0 right-0 h-full w-[240px] bg-[#09090B] border-l-2 border-[#3F3F46] z-[100] pt-16 px-6"
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
                <div className="py-4 mt-8 border-t border-[#3F3F46]">
                  <button className="text-sm uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
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
