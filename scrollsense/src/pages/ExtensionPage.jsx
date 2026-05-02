import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, FolderOpen, Puzzle, ToggleRight, ArrowLeft, CheckCircle, Chrome } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'DOWNLOAD THE ZIP',
    description: 'Click the download button above to get the extension ZIP file. Save it anywhere on your computer.',
  },
  {
    number: '02',
    icon: FolderOpen,
    title: 'EXTRACT THE ZIP',
    description: 'Right-click the downloaded ZIP file and select "Extract All" (Windows) or double-click it (Mac). Remember where you extracted it.',
  },
  {
    number: '03',
    icon: Chrome,
    title: 'OPEN CHROME EXTENSIONS',
    description: 'Open Chrome and go to chrome://extensions in the address bar. Or click the three dots menu → Extensions → Manage Extensions.',
  },
  {
    number: '04',
    icon: ToggleRight,
    title: 'ENABLE DEVELOPER MODE',
    description: 'Find the "Developer mode" toggle in the top-right corner of the extensions page and turn it ON.',
  },
  {
    number: '05',
    icon: Puzzle,
    title: 'LOAD THE EXTENSION',
    description: 'Click "Load unpacked" button that appears in the top-left. Navigate to the extracted folder and select it.',
  },
  {
    number: '06',
    icon: CheckCircle,
    title: 'YOU\'RE ALL SET',
    description: 'The ScrollSense extension is now installed! Make sure you\'re logged into ScrollSense in your browser for it to track your watch time.',
  },
];

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] selection:bg-[#DFE104] selection:text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#09090B] border-b border-[#3F3F46] z-50">
        <div className="max-w-[95vw] h-full mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="font-bold text-base uppercase tracking-tighter text-[#FAFAFA] hover:text-[#DFE104] transition-colors duration-200"
          >
            SCROLLSENSE
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            BACK TO HOME
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24">
        <div className="max-w-[95vw] mx-auto px-4 md:px-8">

          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center mb-4">
              <div className="w-[3px] h-4 bg-[#DFE104] mr-3" />
              <span className="text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
                BROWSER EXTENSION
              </span>
            </div>

            <h1
              className="font-bold uppercase tracking-tighter text-[#FAFAFA]"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 6rem)',
                lineHeight: '0.9',
              }}
            >
              GET THE<br />
              <span className="text-[#DFE104]">EXTENSION</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-[#A1A1AA] font-medium max-w-2xl leading-relaxed">
              The ScrollSense Chrome extension tracks your actual YouTube watch time in real-time,
              so your dashboard shows real minutes instead of estimated ones. Install it in under 2 minutes.
            </p>
          </motion.div>

          {/* Download card */}
          <motion.div
            className="mt-12 border border-[#3F3F46] bg-[#18181B] p-8 md:p-12 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">
                  SCROLLSENSE WATCH TRACKER
                </h2>
                <p className="text-sm text-[#A1A1AA] mt-1 uppercase tracking-wider">
                  v1.0.0 — Chrome / Edge / Brave
                </p>
              </div>
              <a
                href="/scrollsense-extension.zip"
                download="scrollsense-extension.zip"
                className="flex items-center justify-center gap-3 bg-[#DFE104] text-black font-bold h-14 px-8 text-sm uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap shrink-0"
              >
                <Download size={20} />
                DOWNLOAD ZIP
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-[#3F3F46] flex flex-wrap gap-6">
              <div>
                <span className="text-xs text-[#71717A] uppercase tracking-wider">SIZE</span>
                <p className="text-sm text-[#FAFAFA] font-medium mt-1">~25 KB</p>
              </div>
              <div>
                <span className="text-xs text-[#71717A] uppercase tracking-wider">WORKS ON</span>
                <p className="text-sm text-[#FAFAFA] font-medium mt-1">Chrome, Edge, Brave, Arc</p>
              </div>
              <div>
                <span className="text-xs text-[#71717A] uppercase tracking-wider">PERMISSIONS</span>
                <p className="text-sm text-[#FAFAFA] font-medium mt-1">YouTube access, Storage</p>
              </div>
            </div>
          </motion.div>

          {/* Installation steps */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center mb-4">
              <div className="w-[3px] h-4 bg-[#DFE104] mr-3" />
              <span className="text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
                INSTALLATION GUIDE
              </span>
            </div>

            <h2
              className="font-bold uppercase tracking-tighter text-[#FAFAFA] mb-12"
              style={{
                fontSize: 'clamp(2rem, 4vw, 4rem)',
                lineHeight: '0.9',
              }}
            >
              HOW TO INSTALL
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.number}
                    className="border border-[#3F3F46] bg-[#18181B] p-6 md:p-8 relative group hover:border-[#DFE104]/30 transition-colors duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index + 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-4xl font-bold text-[#27272A] tracking-tighter">
                        {step.number}
                      </span>
                      <Icon size={24} className="text-[#DFE104]" />
                    </div>
                    <h3 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Important notes */}
          <motion.div
            className="mt-16 border border-[#DFE104]/20 bg-[#DFE104]/5 p-8 md:p-10 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <h3 className="text-base font-bold uppercase tracking-tighter text-[#DFE104] mb-4">
              IMPORTANT NOTES
            </h3>
            <ul className="space-y-3 text-sm text-[#A1A1AA] leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-[#DFE104] mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-[#FAFAFA]">Stay logged in:</strong> Make sure you're logged into ScrollSense
                  in the same browser. The extension reads your session to send data to your account.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DFE104] mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-[#FAFAFA]">Don't delete the folder:</strong> Chrome loads the extension
                  from the extracted folder. If you delete or move it, the extension will stop working.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DFE104] mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-[#FAFAFA]">Updates:</strong> When we release a new version, download the
                  new ZIP, extract it to the same folder (overwrite), then go to chrome://extensions and click
                  the refresh icon on the ScrollSense card.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DFE104] mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-[#FAFAFA]">Chrome restart warning:</strong> Chrome may show a
                  "Disable developer mode extensions" popup on startup. Just click the three dots and select
                  "Keep" to dismiss it.
                </span>
              </li>
            </ul>
          </motion.div>

          {/* FAQ section */}
          <motion.div
            className="mt-20 max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="flex items-center mb-4">
              <div className="w-[3px] h-4 bg-[#DFE104] mr-3" />
              <span className="text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
                FAQ
              </span>
            </div>

            <h2
              className="font-bold uppercase tracking-tighter text-[#FAFAFA] mb-10"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 3rem)',
                lineHeight: '0.9',
              }}
            >
              COMMON QUESTIONS
            </h2>

            <div className="space-y-6">
              {[
                {
                  q: 'Why isn\'t this on the Chrome Web Store?',
                  a: 'We\'re working on getting it published. In the meantime, loading it as an unpacked extension works exactly the same — there\'s no difference in functionality or security.',
                },
                {
                  q: 'Does this work on Firefox or Safari?',
                  a: 'Currently only Chromium-based browsers are supported (Chrome, Edge, Brave, Arc, Opera). Firefox and Safari support is coming soon.',
                },
                {
                  q: 'Is my data safe?',
                  a: 'The extension only tracks watch time on YouTube. It doesn\'t record video titles, search history, or any other browsing data. All data is sent securely to your ScrollSense account.',
                },
                {
                  q: 'The extension stopped working after a Chrome update.',
                  a: 'Go to chrome://extensions, find ScrollSense, and click the refresh icon. If that doesn\'t work, remove it and re-load the unpacked folder.',
                },
              ].map((faq, i) => (
                <div key={i} className="border-b border-[#3F3F46] pb-6">
                  <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            className="mt-20 flex flex-col md:flex-row items-start md:items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <Link
              to="/signup"
              className="flex items-center justify-center bg-[#DFE104] text-black font-bold h-14 px-8 text-sm uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all duration-200"
            >
              CREATE YOUR FREE ACCOUNT
            </Link>
            <span className="text-sm text-[#71717A]">
              Don't have an account yet? Sign up first, then install the extension.
            </span>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
