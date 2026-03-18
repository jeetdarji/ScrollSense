import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const COMPARISON_DATA = [
  { feature: "Content breakdown by category", scrollsense: "✓", onesec: "✗", screentime: "✗", youtube: "Partial" },
  { feature: "Intentional vs zombie scroll detection", scrollsense: "✓", onesec: "✗", screentime: "✗", youtube: "✗" },
  { feature: "Goal alignment scoring", scrollsense: "✓", onesec: "✗", screentime: "✗", youtube: "✗" },
  { feature: "Cross-platform (YouTube + Instagram)", scrollsense: "✓", onesec: "✗", screentime: "✗", youtube: "✗" },
  { feature: "Behavioral change (not hard blocking)", scrollsense: "✓", onesec: "Hard block only", screentime: "✗", youtube: "✗" },
  { feature: "Full data transparency + delete", scrollsense: "✓", onesec: "Partial", screentime: "✗", youtube: "✗" },
];

const RenderCell = ({ val }) => {
  if (val === "✓") {
    return <Check className="text-[#DFE104] inline-block" size={20} aria-label="Yes" />;
  }
  if (val === "✗") {
    return <X className="text-[#3F3F46] inline-block" size={20} aria-label="No" />;
  }
  return <span className="whitespace-nowrap">{val}</span>;
};

const Comparison = () => {
  return (
    <section className="bg-[#09090B] py-24 md:py-32 border-t border-[#3F3F46]">
      <div className="max-w-[95vw] mx-auto px-4 md:px-8">
        
        <div className="mb-4">
          <span className="text-xs uppercase tracking-widest text-[#DFE104]">VS THE ALTERNATIVES</span>
        </div>

        <motion.h2 
          className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA] mb-16 max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          EVERY OTHER APP EITHER BLOCKS OR IGNORES. WE SHOW.
        </motion.h2>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="bg-[#27272A]">
                <th className="py-4 px-6 text-xs uppercase tracking-widest text-[#A1A1AA] font-medium min-w-[250px]">FEATURE</th>
                <th className="py-4 px-6 text-xs uppercase tracking-widest text-[#DFE104] font-medium w-[18%]">SCROLLSENSE</th>
                <th className="py-4 px-6 text-xs uppercase tracking-widest text-[#A1A1AA] font-medium w-[18%]">ONE SEC &amp; OPAL</th>
                <th className="py-4 px-6 text-xs uppercase tracking-widest text-[#A1A1AA] font-medium w-[18%]">SCREENTIME</th>
                <th className="py-4 px-6 text-xs uppercase tracking-widest text-[#A1A1AA] font-medium w-[18%]">YT HISTORY SITES</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-[#3F3F46] ${idx % 2 === 0 ? 'bg-[#09090B]' : 'bg-[#27272A]/30'}`}
                >
                  <td className="py-5 px-6 text-sm text-[#FAFAFA] font-medium">{row.feature}</td>
                  <td className="py-5 px-6 text-sm text-[#DFE104] font-bold"><RenderCell val={row.scrollsense} /></td>
                  <td className="py-5 px-6 text-sm text-[#A1A1AA]"><RenderCell val={row.onesec} /></td>
                  <td className="py-5 px-6 text-sm text-[#A1A1AA]"><RenderCell val={row.screentime} /></td>
                  <td className="py-5 px-6 text-sm text-[#A1A1AA]"><RenderCell val={row.youtube} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
};

export default Comparison;
