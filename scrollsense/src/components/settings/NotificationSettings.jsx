import React from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const Toggle = ({ isOn, onToggle }) => (
  <div 
    className={`w-10 h-5 relative cursor-pointer border ${isOn ? 'bg-[#DFE104]/20 border-[#DFE104]/50' : 'bg-[#27272A] border-[#3F3F46]'}`}
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

const NotificationSettings = () => {
  const [notifications, setNotifications] = useLocalStorage('scrollsense_notifications', {
    weeklyDigest: true,
    emailDigest: false,
    emailAddress: '',
    dailyLimitAlerts: true,
    instagramReminder: true,
    instagramFrequency: 'monthly',
    goalNudges: true
  });

  const updateSetting = (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 w-full rounded-none">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-[14px] h-[14px] text-[#FAFAFA]" />
        <h2 className="text-sm font-bold uppercase text-[#FAFAFA] m-0">NOTIFICATION PREFERENCES</h2>
      </div>

      <div className="flex flex-col gap-0 border-t border-[#3F3F46]">
        {/* WEEKLY CHECK-IN DIGEST */}
        <div className="flex items-center justify-between py-4 border-b border-[#3F3F46]">
          <div>
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">WEEKLY CHECK-IN DIGEST</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">In-app notification when your check-in is ready</div>
          </div>
          <Toggle 
            isOn={notifications.weeklyDigest} 
            onToggle={() => updateSetting('weeklyDigest', !notifications.weeklyDigest)} 
          />
        </div>

        {/* EMAIL DIGEST */}
        <div className="flex flex-col py-4 border-b border-[#3F3F46] gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-[#FAFAFA]">EMAIL DIGEST</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Send check-in to your email</div>
            </div>
            <Toggle 
              isOn={notifications.emailDigest} 
              onToggle={() => updateSetting('emailDigest', !notifications.emailDigest)} 
            />
          </div>
          {notifications.emailDigest && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <input 
                type="email" 
                placeholder="your@email.com"
                value={notifications.emailAddress}
                onChange={(e) => updateSetting('emailAddress', e.target.value)}
                className="w-full bg-[#27272A]/40 border-2 border-[#3F3F46] px-4 py-2 text-xs text-[#FAFAFA] placeholder:text-[#A1A1AA] outline-none focus:border-[#DFE104] transition-colors rounded-none"
              />
            </motion.div>
          )}
        </div>

        {/* DAILY LIMIT ALERTS */}
        <div className="flex items-center justify-between py-4 border-b border-[#3F3F46]">
          <div>
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">DAILY LIMIT ALERTS</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">Browser notification when you hit your limit</div>
          </div>
          <Toggle 
            isOn={notifications.dailyLimitAlerts} 
            onToggle={() => updateSetting('dailyLimitAlerts', !notifications.dailyLimitAlerts)} 
          />
        </div>

        {/* INSTAGRAM EXPORT REMINDER */}
        <div className="flex flex-col py-4 border-b border-[#3F3F46] gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-[#FAFAFA]">INSTAGRAM EXPORT REMINDER</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Remind me to upload a fresh Instagram export</div>
            </div>
            <Toggle 
              isOn={notifications.instagramReminder} 
              onToggle={() => updateSetting('instagramReminder', !notifications.instagramReminder)} 
            />
          </div>
          {notifications.instagramReminder && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <select 
                value={notifications.instagramFrequency}
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
          <div>
            <div className="text-xs font-bold uppercase text-[#FAFAFA]">GOAL NUDGES</div>
            <div className="text-[10px] text-[#A1A1AA] mt-1">Occasional reminders about your stated goals</div>
          </div>
          <Toggle 
            isOn={notifications.goalNudges} 
            onToggle={() => updateSetting('goalNudges', !notifications.goalNudges)} 
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;