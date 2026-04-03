import React, { useState } from 'react';
import { HelpCircle, Camera } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import dayjs from 'dayjs';

const InstagramDataGuide = () => {
  const [instagramProcessed] = useLocalStorage('scrollsense_instagram_processed', null);
  const [instagramTopics] = useLocalStorage('scrollsense_instagram_topics', []);
  const hasInstagram = instagramProcessed !== null;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* SECTION 1: THE CONCERN, ADDRESSED DIRECTLY */}
      <div className="border-2 border-[#DFE104]/20 bg-[#DFE104]/5 p-6 rounded-none">
        <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] m-0 mb-4">
          WE KNOW WHAT YOU'RE THINKING
        </h2>

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-[13px] h-[13px] text-[#A1A1AA]" />
              <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                CAN SCROLLSENSE SEE WHICH SPECIFIC REELS I WATCHED?
              </div>
            </div>
            <div className="pl-5 text-xs text-[#A1A1AA] leading-relaxed">
              No. Instagram's export gives us the creator's username and a timestamp — not the specific reel. Even if you watched something you'd rather keep private, ScrollSense has no way to know what it was. We only know you watched SOMETHING by @thatcreator at 11pm.
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-[13px] h-[13px] text-[#A1A1AA]" />
              <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                DOES SCROLLSENSE UPLOAD MY INSTAGRAM FILES TO A SERVER?
              </div>
            </div>
            <div className="pl-5 text-xs text-[#A1A1AA] leading-relaxed">
              No. Your Instagram files are processed entirely in your browser — the same browser tab you're reading this in. The file is opened, the data is parsed, the result is saved locally, and the file is never sent anywhere. You can verify this by turning off your WiFi after uploading and checking — ScrollSense still works with the data.
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-[13px] h-[13px] text-[#A1A1AA]" />
              <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                WHAT IF I WATCHED SOMETHING EMBARRASSING?
              </div>
            </div>
            <div className="pl-5 text-xs text-[#A1A1AA] leading-relaxed">
              We genuinely cannot see it. The reel URL exists in your export file, but our code throws it away immediately — we only extract the creator's public username and the timestamp. What the video was about is never known to us. Not stored. Not sent. Gone.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: WHAT THE FILE ACTUALLY LOOKS LIKE */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0 mb-2">
          EXACTLY WHAT YOUR FILE CONTAINS
        </h3>
        <p className="text-xs text-[#3F3F46] uppercase tracking-wider mb-4">
          This is a real entry from a videos_watched.json file
        </p>

        <div className="bg-[#09090B] border border-[#27272A] p-4 font-mono text-xs overflow-x-auto whitespace-pre">
          <span className="text-[#A1A1AA]">{"{\n"}</span>
          <span className="text-[#A1A1AA]">  "timestamp":</span> <span className="text-[#FAFAFA]">1772673300</span><span className="text-[#A1A1AA]">,</span> <span className="text-[#3F3F46] italic">← ScrollSense keeps this</span>
          {"\n"}
          <span className="text-[#A1A1AA]">{"  \"media\": [],\n"}</span>
          <span className="text-[#A1A1AA]">{"  \"label_values\": [\n"}</span>
          <span className="text-[#A1A1AA]">{"    {\n"}</span>
          <span className="text-[#A1A1AA]">{"      \"label\":"}</span> <span className="text-[#DFE104]">"URL"</span><span className="text-[#A1A1AA]">{",\n"}</span>
          <span className="text-[#A1A1AA]">{"      \"value\":"}</span> <span className="text-[#DFE104]">"https://instagram.com/p/DKRT0k..."</span><span className="text-[#A1A1AA]">,</span> <span className="text-[#3F3F46] italic">← ScrollSense discards this</span>
          {"\n"}
          <span className="text-[#A1A1AA]">{"    },\n"}</span>
          <span className="text-[#A1A1AA]">{"    {\n"}</span>
          <span className="text-[#A1A1AA]">{"      \"title\":"}</span> <span className="text-[#DFE104]">"Owner"</span><span className="text-[#A1A1AA]">{",\n"}</span>
          <span className="text-[#A1A1AA]">{"      \"dict\": [\n"}</span>
          <span className="text-[#A1A1AA]">{"        { \"label\":"}</span> <span className="text-[#DFE104]">"Username"</span><span className="text-[#A1A1AA]">, "value":</span> <span className="text-[#DFE104]">"kushsachdeva"</span> <span className="text-[#A1A1AA]">{"}"}</span><span className="text-[#A1A1AA]">,</span> <span className="text-[#3F3F46] italic">← ScrollSense keeps this</span>
          {"\n"}
          <span className="text-[#A1A1AA]">{"        { \"label\":"}</span> <span className="text-[#DFE104]">"Name"</span><span className="text-[#A1A1AA]">, "value":</span> <span className="text-[#DFE104]">"Kussh Sachdev"</span> <span className="text-[#A1A1AA]">{"}"}</span><span className="text-[#A1A1AA]">,</span> <span className="text-[#3F3F46] italic">← ScrollSense discards this</span>
          {"\n"}
          <span className="text-[#A1A1AA]">{"      ]\n"}</span>
          <span className="text-[#A1A1AA]">{"    }\n"}</span>
          <span className="text-[#A1A1AA]">{"  ]\n"}</span>
          <span className="text-[#A1A1AA]">{"}"}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 max-sm:grid-cols-1">
          {/* Left - KEPT */}
          <div className="bg-[#DFE104]/5 border border-[#DFE104]/20 p-3">
            <div className="text-[10px] uppercase text-[#DFE104] mb-2 font-bold">SCROLLSENSE KEEPS</div>
            <div className="text-xs font-mono text-[#DFE104]">username: kushsachdeva</div>
            <div className="text-xs font-mono text-[#DFE104] mt-1">timestamp: 1772673300</div>
            <div className="text-[10px] text-[#A1A1AA] mt-2">Public info + when you watched</div>
          </div>

          {/* Right - DISCARDED */}
          <div className="bg-[#27272A]/40 border border-[#3F3F46] p-3">
            <div className="text-[10px] uppercase text-[#3F3F46] mb-2 font-bold">SCROLLSENSE DISCARDS</div>
            <div className="text-xs font-mono text-[#3F3F46]">url: instagram.com/p/DK...</div>
            <div className="text-xs font-mono text-[#3F3F46] mt-1">name: Kussh Sachdev</div>
            <div className="text-xs font-mono text-[#3F3F46] mt-1">fbid: 17841407969...</div>
            <div className="text-[10px] text-[#3F3F46] mt-2">Specific reel + full name + internal ID</div>
          </div>
        </div>
      </div>

      {/* SECTION 3: YOUR INSTAGRAM DATA STATUS */}
      {hasInstagram ? (
        <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0 mb-4">
            YOUR INSTAGRAM SNAPSHOT
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-[#FAFAFA]">{instagramProcessed.totalVideos}</div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">REELS ANALYZED</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#FAFAFA] flex items-end h-[32px] mb-1">
                {instagramProcessed.dateRange || 'N/A'}
              </div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">DATA COVERS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#FAFAFA]">
                {instagramProcessed.echoChamberData?.uniqueCreators || 0}
              </div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">UNIQUE CREATORS</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#FAFAFA] flex items-end h-[32px] mb-1">
                {instagramProcessed.processedAt ? dayjs(instagramProcessed.processedAt).format('MMM D, YYYY') : 'N/A'}
              </div>
              <div className="text-[10px] uppercase text-[#A1A1AA] mt-1">PROCESSED ON</div>
            </div>
          </div>

          {instagramTopics && instagramTopics.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] uppercase text-[#A1A1AA] mb-3">
                INSTAGRAM SAYS YOU'RE INTERESTED IN
              </div>
              <div className="flex flex-wrap gap-2">
                {instagramTopics.slice(0, 15).map((topic, i) => (
                  <div key={i} className="border border-[#3F3F46] px-3 py-1 text-[10px] uppercase text-[#A1A1AA]">
                    {topic.name || topic}
                  </div>
                ))}
                {instagramTopics.length > 15 && (
                  <div className="border border-[#3F3F46] border-dashed px-3 py-1 text-[10px] uppercase text-[#3F3F46]">
                    + {instagramTopics.length - 15} MORE
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => window.location.href = '/patterns'} 
              className="border-2 border-[#3F3F46] px-5 py-2.5 text-xs uppercase tracking-tighter text-[#FAFAFA] bg-transparent hover:border-[#FAFAFA]/30 transition-all rounded-none font-bold"
            >
              RE-UPLOAD INSTAGRAM EXPORT
            </button>
            <button 
              onClick={() => {
                if(window.confirm('Are you sure you want to delete your Instagram data? This only removes it from ScrollSense.')) {
                  localStorage.removeItem('scrollsense_instagram_processed');
                  localStorage.removeItem('scrollsense_instagram_topics');
                  window.location.reload();
                }
              }}
              className="border border-red-900/50 px-5 py-2.5 text-xs uppercase tracking-tighter text-red-400 bg-transparent hover:bg-red-900/20 transition-all rounded-none font-bold"
            >
              DELETE INSTAGRAM DATA ONLY
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-[#27272A] bg-[#09090B] p-6 text-center rounded-none">
          <Camera className="w-5 h-5 text-[#3F3F46] mx-auto mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-tighter text-[#3F3F46] m-0 mb-2">
            NO INSTAGRAM DATA UPLOADED YET
          </h3>
          <p className="text-xs text-[#3F3F46] leading-relaxed mb-4 max-w-sm mx-auto">
            Instagram features are optional. You get full value from ScrollSense with YouTube alone.
          </p>
          <button 
            onClick={() => window.location.href = '/patterns'}
            className="border border-[#3F3F46] bg-transparent px-6 py-3 text-xs uppercase tracking-tighter text-[#A1A1AA] rounded-none hover:border-[#FAFAFA]/20 hover:text-[#FAFAFA] transition-all font-bold"
          >
            UPLOAD INSTAGRAM EXPORT →
          </button>
        </div>
      )}
    </div>
  );
};

export default InstagramDataGuide;