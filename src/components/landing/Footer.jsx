import React from 'react';
import { Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#09090B] border-t-2 border-[#3F3F46] pt-16 pb-8">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1 — Brand */}
          <div>
            <div className="font-bold uppercase tracking-tighter text-lg text-[#FAFAFA]">
              SCROLLSENSE
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mt-3 max-w-[200px]">
              Behavioral awareness for anyone who wants to scroll less and live more.
            </p>
            <div className="mt-6">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors w-fit focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]">
                <Github size={16} />
                <span>OPEN SOURCE</span>
              </a>
            </div>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-bold">
              PRODUCT
            </h4>
            <div className="flex flex-col gap-3">
              {['Features', 'How It Works', 'Pricing', 'Changelog'].map((link) => (
                <a key={link} href="#" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors uppercase tracking-wide w-fit focus:outline-none focus:underline underline-offset-4 decoration-[#DFE104]">
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Column 3 — Privacy */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-bold">
              PRIVACY
            </h4>
            <div className="flex flex-col gap-3">
              {['Data Vault', 'Privacy Policy', 'Delete My Data', 'What We Store'].map((link) => (
                <a key={link} href="#" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors uppercase tracking-wide w-fit focus:outline-none focus:underline underline-offset-4 decoration-[#DFE104]">
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Column 4 — Company */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#A1A1AA] mb-4 font-bold">
              COMPANY
            </h4>
            <div className="flex flex-col gap-3">
              {['About', 'Blog', 'Contact', 'Open Source'].map((link) => (
                <a key={link} href="#" className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors uppercase tracking-wide w-fit focus:outline-none focus:underline underline-offset-4 decoration-[#DFE104]">
                  {link}
                </a>
              ))}
            </div>
          </div>

        </div>

        <div className="border-t border-[#3F3F46] pt-8 flex justify-between items-center flex-wrap gap-4">
          <p className="text-xs text-[#3F3F46] uppercase tracking-wider font-medium">
            © 2025 SCROLLSENSE — KNOW WHAT YOU WATCH. OWN HOW YOU FEEL.
          </p>
          <p className="text-xs text-[#3F3F46] uppercase tracking-wider font-medium">
            BUILT FOR PEOPLE. NOT FOR ADVERTISERS.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
