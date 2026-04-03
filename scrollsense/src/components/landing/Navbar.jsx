import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#09090B] border-b border-[#3F3F46] z-50">
      <div className="max-w-[95vw] h-full mx-auto flex items-center justify-between">
        
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Link 
            to="/" 
            className="font-bold text-base uppercase tracking-tighter text-[#FAFAFA] hover:text-[#DFE104] transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
          >
            SCROLLSENSE
          </Link>
        </div>

        {/* Center: Nav links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'How it works', 'Privacy', 'Community'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm uppercase tracking-widest text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Right: Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            to="/login"
            className="flex items-center justify-center border border-[#3F3F46] bg-transparent text-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-black h-9 px-6 text-sm uppercase tracking-tighter rounded-none transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
          >
            LOG IN
          </Link>
          <Link 
            to="/signup"
            className="flex items-center justify-center bg-[#DFE104] text-black font-bold h-9 px-6 text-sm uppercase tracking-tighter rounded-none hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFE104]"
          >
            GET STARTED FREE
          </Link>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-[#FAFAFA] focus:outline-none"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-[#09090B] z-50 flex flex-col p-6">
          <div className="flex justify-end">
            <button 
              className="text-[#FAFAFA] focus:outline-none"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={32} />
            </button>
          </div>
          <nav className="flex flex-col gap-6 mt-12">
            {['Features', 'How it works', 'Privacy', 'Community'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-4xl uppercase font-bold tracking-tighter text-[#FAFAFA] hover:text-[#DFE104] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="mt-8 flex flex-col gap-4">
              <Link 
                to="/login"
                className="flex items-center justify-center border border-[#3F3F46] bg-transparent text-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-black h-14 px-6 text-xl uppercase tracking-tighter rounded-none transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                LOG IN
              </Link>
              <Link 
                to="/signup"
                className="flex items-center justify-center bg-[#DFE104] text-black font-bold h-14 px-6 text-xl uppercase tracking-tighter rounded-none transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                GET STARTED FREE
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
