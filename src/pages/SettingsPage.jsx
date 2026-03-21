import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Camera, Database, User as UserIcon, Bell, Trash2 } from 'lucide-react';

import DashboardNav from '../components/dashboard/DashboardNav';
import PrivacyEducation from '../components/settings/PrivacyEducation';
import InstagramDataGuide from '../components/settings/InstagramDataGuide';
import DataVault from '../components/settings/DataVault';
import AccountSettings from '../components/settings/AccountSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import DeleteAccount from '../components/settings/DeleteAccount';

const NAV_ITEMS = [
  { id: 'privacy', icon: Shield, label: 'PRIVACY GUIDE' },
  { id: 'instagram', icon: Camera, label: 'INSTAGRAM DATA' },
  { id: 'data_vault', icon: Database, label: 'DATA VAULT' },
  { id: 'account', icon: UserIcon, label: 'MY ACCOUNT' },
  { id: 'notifications', icon: Bell, label: 'NOTIFICATIONS' },
  { id: 'delete', icon: Trash2, label: 'DELETE DATA' },
];

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('privacy');

  const renderSection = () => {
    switch (activeSection) {
      case 'privacy': return <PrivacyEducation />;
      case 'instagram': return <InstagramDataGuide />;
      case 'data_vault': return <DataVault />;
      case 'account': return <AccountSettings />;
      case 'notifications': return <NotificationSettings />;
      case 'delete': return <DeleteAccount />;
      default: return <PrivacyEducation />;
    }
  };

  return (
    <>
      <DashboardNav />
      {/* Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03]">
        <svg className="absolute h-full w-full">
          <filter id="noise-settings">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-settings)" />
        </svg>
      </div>

      <div className="min-h-screen bg-[#09090B] pt-[56px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="max-w-[95vw] mx-auto px-4 py-8 md:py-12"
        >
          {/* HEADER */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-[#DFE104] mb-2 font-bold">
              SETTINGS & PRIVACY
            </div>
            <h1 
              className="font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA] m-0"
              style={{ fontSize: 'clamp(2rem,6vw,4rem)' }}
            >
              YOUR DATA. YOUR CONTROL.
            </h1>
            <p className="mt-4 text-sm md:text-base text-[#A1A1AA] max-w-2xl leading-relaxed">
              Everything ScrollSense knows about you, why we know it, and what you can do with it — explained like a human being, not a privacy policy.
            </p>
          </div>

          <div className="border-b-2 border-[#3F3F46] mt-6 mb-10" />

          {/* MAIN LAYOUT */}
          <div className="lg:grid lg:grid-cols-[220px_1fr] flex flex-col gap-8">
            
            {/* MOBILE NAV (Tabs) */}
            <div className="lg:hidden overflow-x-auto overflow-y-hidden scrollbar-hide flex gap-0 border-b-2 border-[#3F3F46] mb-8">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-4 py-3 text-xs uppercase tracking-wider font-bold whitespace-nowrap cursor-pointer flex-shrink-0 transition-colors relative
                    ${activeSection === item.id ? 'text-[#DFE104] border-b-2 border-[#DFE104] -mb-[2px]' : 'text-[#3F3F46] hover:text-[#A1A1AA] border-b-2 border-transparent'}`
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* DESKTOP NAV (Sidebar) */}
            <div className="hidden lg:flex lg:flex-col sticky top-[72px] h-fit">
              <div className="border-2 border-[#3F3F46] p-4 flex flex-col gap-1 w-[220px]">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 rounded-none w-full text-left
                        ${isActive 
                          ? 'bg-[#DFE104]/10 border-l-2 border-[#DFE104] text-[#DFE104]' 
                          : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/30 border-l-2 border-transparent'
                        }`}
                    >
                      <Icon className="w-[14px] h-[14px] flex-shrink-0" />
                      <span className="text-xs uppercase tracking-wider font-bold">{item.label}</span>
                    </button>
                  );
                })}

                <div className="border-t border-[#3F3F46] pt-4 mt-4 text-center">
                  <div className="text-[10px] uppercase text-[#27272A] font-bold tracking-wider">
                    SCROLLSENSE V1.0
                  </div>
                  <div className="text-[10px] uppercase text-[#27272A] tracking-wider mt-1 font-bold">
                    BUILT FOR HONEST SCROLLING
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="w-full relative min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SettingsPage;