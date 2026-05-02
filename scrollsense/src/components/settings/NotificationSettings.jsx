import React, { useState, useEffect } from 'react';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toggle = ({ isOn, onToggle }) => (
  <div 
    className={`w-10 h-5 relative cursor-pointer border flex-shrink-0 transition-colors ${isOn ? 'bg-[#DFE104]/20 border-[#DFE104]/50' : 'bg-[#27272A] border-[#3F3F46]'}`}
    onClick={onToggle}
  >
    <motion.div 
      className={`w-4 h-4 absolute top-[1px] ${isOn ? 'bg-[#DFE104]' : 'bg-[#3F3F46]'}`}
      initial={false}
      animate={{ left: isOn ? '22px' : '2px' }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </div>
);

const NotificationSettings = ({ settings, updateNotifications, isUpdatingNotifications }) => {
  const [localNotifs, setLocalNotifs] = useState(() => {
    return settings?.notificationPreferences || {
      weeklyDigest: true,
      emailDigest: false,
      emailAddress: '',
      dailyLimitAlerts: true,
      instagramReminder: true,
      instagramFrequency: 'monthly',
      goalNudges: true
    };
  });
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Sync if settings change from outside (after successful save or re-fetch)
  useEffect(() => {
    if (settings?.notificationPreferences && !isDirty) {
      setLocalNotifs(settings.notificationPreferences);
    }
  }, [settings?.notificationPreferences, isDirty]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      updateNotifications(localNotifs, {
        onSuccess: () => {
          setIsDirty(false);
          setShowSavedIndicator(true);
          setTimeout(() => setShowSavedIndicator(false), 2000);
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [localNotifs, isDirty, updateNotifications]);

  const updateSetting = (key, value) => {
    setLocalNotifs(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  return (
    <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 w-full rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-[14px] h-[14px] text-[#FAFAFA]" />
          <h2 className="text-sm font-bold uppercase text-[#FAFAFA] m-0">NOTIFICATION PREFERENCES</h2>
        </div>
        
        <div className="h-5 flex items-center">
          <AnimatePresence mode="wait">
            {isUpdatingNotifications ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A1A1AA]"
              >
                <Loader2 className="w-3 h-3 animate-spin text-[#DFE104]" /> SAVING
              </motion.div>
            ) : showSavedIndicator ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#DFE104]"
              >
                <CheckCircle2 className="w-3 h-3" /> SAVED
              </motion.div>
            ) : (
              <motion.div key="empty" className="w-[60px]" />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-0 border-t border-[#3F3F46]">
        {/* WEEKLY CHECK-IN DIGEST */}
        <div className="flex items-center justify-between py-4 border-b border-[#3F3F46]">
          <div className="pr-4">
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">WEEKLY CHECK-IN DIGEST</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">In-app notification when your check-in is ready</div>
          </div>
          <Toggle 
            isOn={localNotifs.weeklyDigest} 
            onToggle={() => updateSetting('weeklyDigest', !localNotifs.weeklyDigest)} 
          />
        </div>

        {/* EMAIL DIGEST */}
        <div className="flex flex-col py-4 border-b border-[#3F3F46] gap-3">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-xs font-bold uppercase text-[#FAFAFA]">EMAIL DIGEST</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Send check-in to your email</div>
            </div>
            <Toggle 
              isOn={localNotifs.emailDigest} 
              onToggle={() => updateSetting('emailDigest', !localNotifs.emailDigest)} 
            />
          </div>
          {localNotifs.emailDigest && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <input 
                type="email" 
                placeholder="your@email.com"
                value={localNotifs.emailAddress}
                onChange={(e) => updateSetting('emailAddress', e.target.value)}
                className="w-full bg-[#27272A]/40 border-2 border-[#3F3F46] px-4 py-2 text-xs text-[#FAFAFA] placeholder:text-[#A1A1AA] outline-none focus:border-[#DFE104] transition-colors rounded-none"
              />
            </motion.div>
          )}
        </div>

        {/* DAILY LIMIT ALERTS */}
        <div className="flex items-center justify-between py-4 border-b border-[#3F3F46]">
          <div className="pr-4">
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">DAILY LIMIT ALERTS</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">Browser notification when you hit your limit</div>
          </div>
          <Toggle 
            isOn={localNotifs.dailyLimitAlerts} 
            onToggle={() => updateSetting('dailyLimitAlerts', !localNotifs.dailyLimitAlerts)} 
          />
        </div>

        {/* INSTAGRAM EXPORT REMINDER */}
        <div className="flex flex-col py-4 border-b border-[#3F3F46] gap-3">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <div className="text-xs font-bold uppercase text-[#FAFAFA]">INSTAGRAM EXPORT REMINDER</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Remind me to upload a fresh Instagram export</div>
            </div>
            <Toggle 
              isOn={localNotifs.instagramReminder} 
              onToggle={() => updateSetting('instagramReminder', !localNotifs.instagramReminder)} 
            />
          </div>
          {localNotifs.instagramReminder && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <select 
                value={localNotifs.instagramFrequency}
                onChange={(e) => updateSetting('instagramFrequency', e.target.value)}
                className="w-full bg-[#27272A]/40 border-2 border-[#3F3F46] px-4 py-2 text-xs text-[#FAFAFA] uppercase outline-none focus:border-[#DFE104] transition-colors rounded-none appearance-none cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="3months">Every 3 months</option>
                <option value="6months">Every 6 months</option>
              </select>
            </motion.div>
          )}
        </div>

        {/* GOAL NUDGES */}
        <div className="flex items-center justify-between py-4">
          <div className="pr-4">
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">GOAL NUDGES</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">Occasional reminders about your stated goals</div>
          </div>
          <Toggle 
            isOn={localNotifs.goalNudges} 
            onToggle={() => updateSetting('goalNudges', !localNotifs.goalNudges)} 
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;