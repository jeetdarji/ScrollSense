import React from 'react';
import { Smile, Check, X, Lock, ArrowRight } from 'lucide-react';

const PrivacyEducation = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* SECTION 1: THE HONEST OPENING */}
      <div className="border-2 border-[#DFE104]/30 bg-[#DFE104]/5 p-6 rounded-none">
        <div className="flex items-center gap-3 mb-4">
          <Smile className="w-[18px] h-[18px] text-[#DFE104]" />
          <h2 className="text-base font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
            LET'S BE COMPLETELY HONEST WITH YOU
          </h2>
        </div>
        
        <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4">
          ScrollSense is a scroll awareness app. To do that job, it needs to know some things about your scrolling habits. We are not going to pretend otherwise. But here is the important part — we built this with a simple rule: collect only what we actually need, store it securely, show it to you transparently, and delete it the moment you ask.
        </p>

        <p className="text-sm text-[#A1A1AA] leading-relaxed m-0">
          Everything below explains exactly what we have, why we have it, and what we do with it. No legal jargon. No buried footnotes. If something here makes you uncomfortable, you can delete everything in 60 seconds from the Delete Data section.
        </p>
      </div>

      {/* SECTION 2: WHAT SCROLLSENSE COLLECTS */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] mb-4">
          WHAT WE ACTUALLY COLLECT
        </h3>

        <div className="flex flex-col gap-4">
          {/* Card A: YouTube Data */}
          <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-[#DFE104]"></div>
              <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
                YOUTUBE — CONNECTED VIA GOOGLE
              </h4>
              <div className="border border-[#DFE104]/30 px-2 py-0.5 text-[10px] uppercase text-[#DFE104] ml-auto">
                AUTOMATIC DAILY UPDATE
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-3">
                WHAT WE READ FROM YOUTUBE
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    title: "WATCH HISTORY (LAST ~500 VIDEOS)",
                    sub: "Video titles and channel names — these get classified by AI into categories, then the titles are thrown away. We only keep the category label."
                  },
                  {
                    title: "VIDEO CATEGORIES & CHANNEL NAMES",
                    sub: "Public information. Same as what YouTube already shows you."
                  },
                  {
                    title: "WATCH TIMESTAMPS",
                    sub: "When you watched, not what specifically. Builds your time-of-day patterns."
                  },
                  {
                    title: "SUBSCRIPTION LIST",
                    sub: "Channel names only. Helps us understand your declared interests vs actual watching."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-[13px] h-[13px] text-[#DFE104] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                        {item.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3F3F46] pt-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-3">
                WHAT WE NEVER TOUCH
              </div>
              <div className="flex flex-col gap-2">
                {[
                  "Gmail, Google Drive, Google Photos",
                  "Your search history on Google",
                  "Location data or device information",
                  "Any Google service outside YouTube"
                ].map((item, i) => (
                  <div key={i} className="text-xs text-[#3F3F46] flex items-center gap-2">
                    <X className="w-3 h-3 text-[#3F3F46] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3F3F46] pt-4 mt-2">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-2">
                WHY DO WE NEED THIS?
              </div>
              <div className="text-xs text-[#A1A1AA] leading-relaxed">
                Without YouTube data, ScrollSense is just a timer app. The Content Diet Dashboard, Goal Relevance Score, and Trigger Pattern Detector all need to know what you actually watched — not just how long you scrolled.
              </div>
            </div>
          </div>

          {/* Card B: Instagram Data */}
          <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-[#FAFAFA]/40"></div>
              <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
                INSTAGRAM — YOU UPLOAD MANUALLY
              </h4>
              <div className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#A1A1AA] ml-auto">
                ONE-TIME SNAPSHOT
              </div>
            </div>

            <div className="bg-[#27272A]/40 border-l-4 border-[#DFE104] pl-4 py-3 pr-4 mb-4">
              <div className="text-xs text-[#A1A1AA] leading-relaxed font-medium">
                We know Instagram feels more personal than YouTube. Your Reels feed can feel private — even embarrassing sometimes. So let us be very specific about what your Instagram export actually contains, and what we do with it.
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-3">
                WHAT YOUR EXPORT FILE CONTAINS
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    title: "CREATOR USERNAME (@handle) FOR EACH REEL",
                    sub: "e.g. '@cristiano' watched at 10:47pm on Monday. Public information — anyone can see that @cristiano posts football content."
                  },
                  {
                    title: "UNIX TIMESTAMP OF WHEN YOU WATCHED",
                    sub: "A number that tells us what time you watched. Nothing about the video itself."
                  },
                  {
                    title: "REEL URL (in some export versions)",
                    sub: "Yes, the file contains the URL to the specific reel. Here is what ScrollSense does with it: nothing. Our parser reads the username and timestamp, then discards the URL immediately. It never leaves your browser."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-[13px] h-[13px] text-[#DFE104] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                        {item.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3F3F46] pt-4 mb-4">
              <div className="text-[10px] uppercase tracking-widest text-[#DFE104] mb-3">
                WHAT SCROLLSENSE ACTUALLY EXTRACTS
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    title: "CREATOR USERNAME → used to calculate creator diversity",
                    sub: "We count how many unique creators you watch to build the Echo Chamber Score. We never show you a list of creators you 'shouldn't' be watching."
                  },
                  {
                    title: "TIMESTAMP → used to build time-of-day patterns",
                    sub: "Combined with YouTube timestamps to show when you are most active across both platforms."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-[13px] h-[13px] text-[#DFE104] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                        {item.sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3F3F46] pt-4">
              <div className="text-[10px] uppercase tracking-widest text-[#A1A1AA] mb-3">
                WHAT WE NEVER EXTRACT OR STORE
              </div>
              <div className="flex flex-col gap-2">
                {[
                  "The specific reel URL — discarded immediately",
                  "The reel title, caption, or content",
                  "Which specific video you watched",
                  "DMs, followers, following lists",
                  "Stories, posts, profile information"
                ].map((item, i) => (
                  <div key={i} className="text-xs text-[#3F3F46] flex items-center gap-2">
                    <X className="w-3 h-3 text-[#3F3F46] flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3F3F46] pt-4 mt-4">
              <div className="flex items-start gap-3">
                <Lock className="w-3.5 h-3.5 text-[#DFE104] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#A1A1AA] leading-relaxed">
                  ALL INSTAGRAM PROCESSING HAPPENS IN YOUR BROWSER. The raw JSON file never leaves your device. ScrollSense processes it in your browser's memory, extracts only usernames and timestamps, and stores those results locally. The original file is never uploaded to any server.
                </div>
              </div>
            </div>
          </div>

          {/* Card C: Session Logs */}
          <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-[#A1A1AA]"></div>
              <h4 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0">
                SESSION LOGS — YOU PROVIDE MANUALLY
              </h4>
              <div className="border border-[#3F3F46] px-2 py-0.5 text-[10px] uppercase text-[#A1A1AA] ml-auto">
                YOU CONTROL THIS
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {[
                {
                  title: "SESSION DURATION — slider you set after scrolling",
                  sub: "A number you type in. Never automatically tracked."
                },
                {
                  title: "MOOD RATING — emoji you select (1–5 scale)",
                  sub: "Anonymous. Never linked to specific content."
                },
                {
                  title: "PLATFORM — which app you were on (YouTube/Instagram)",
                  sub: "Your choice. Never verified externally."
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="w-[13px] h-[13px] text-[#DFE104] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA]">
                      {item.title}
                    </div>
                    <div className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3">
              <X className="w-[13px] h-[13px] text-[#3F3F46] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-[#3F3F46] font-bold uppercase tracking-tighter">
                  WE NEVER TRACK YOUR ACTUAL APP USAGE IN REAL TIME
                </div>
                <div className="text-xs text-[#3F3F46] mt-0.5 leading-relaxed">
                  ScrollSense cannot see when you open Instagram on your phone. Everything is self-reported.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: WHAT MONGODB STORES */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] m-0 mb-1">
          WHAT ACTUALLY LIVES IN OUR DATABASE
        </h3>
        <p className="text-xs text-[#3F3F46] uppercase tracking-wider mb-4">
          This is not a summary. This is the literal list.
        </p>

        <div className="w-full border-2 border-[#3F3F46] overflow-x-auto rounded-none">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-[#27272A]">
                <th className="text-[10px] uppercase tracking-widest text-[#A1A1AA] px-4 py-3 font-normal border-b-2 border-[#3F3F46]">FIELD</th>
                <th className="text-[10px] uppercase tracking-widest text-[#A1A1AA] px-4 py-3 font-normal border-b-2 border-[#3F3F46]">EXAMPLE VALUE</th>
                <th className="text-[10px] uppercase tracking-widest text-[#A1A1AA] px-4 py-3 font-normal border-b-2 border-[#3F3F46]">PURPOSE</th>
              </tr>
            </thead>
            <tbody>
              {[
                { field: "userId", val: '"usr_a8x2k..."', purp: 'Identifies your account' },
                { field: "email", val: '"you@email.com"', purp: 'Login only' },
                { field: "goalPercent", val: '"14"', purp: '% goal-relevant content' },
                { field: "interestPct", val: '"38"', purp: '% interest content' },
                { field: "junkPercent", val: '"48"', purp: '% random content' },
                { field: "sessionDuration", val: '"45 (minutes)"', purp: 'Session length' },
                { field: "moodRating", val: '"3 (neutral)"', purp: 'Post-session mood' },
                { field: "intentionCategory", val: '"boredom"', purp: 'Daily intention' },
                { field: "peakScrollHour", val: '"22 (10pm)"', purp: 'Busiest hour' },
                { field: "triggerPattern", val: '"late_night"', purp: 'When you scroll most' },
                { field: "dailyLimitMin", val: '"90"', purp: 'Your set limit' },
                { field: "createdAt", val: '"2025-02-03T..."', purp: 'Account creation date' }
              ].map((row, i) => (
                <tr key={i} className="border-b border-[#3F3F46] last:border-0 odd:bg-[#09090B] even:bg-[#27272A]/20">
                  <td className="text-xs px-4 py-3 text-[#FAFAFA] font-bold">{row.field}</td>
                  <td className="text-xs px-4 py-3 text-[#DFE104] font-mono">{row.val}</td>
                  <td className="text-xs px-4 py-3 text-[#A1A1AA]">{row.purp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] mb-3">
            WHAT IS NOT IN THIS TABLE
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "VIDEO TITLES", "SEARCH QUERIES", "REEL URLS", 
              "DM CONTENT", "FOLLOWER LISTS", "LOCATION DATA",
              "DEVICE INFO", "REAL NAME", "PROFILE PHOTO",
              "SPECIFIC CONTENT WATCHED"
            ].map((tag, i) => (
              <span key={i} className="border border-[#27272A] px-3 py-1 text-[10px] uppercase text-[#3F3F46]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: THE SHORT VERSION */}
      <div className="border-2 border-[#3F3F46] bg-[#09090B] p-5 rounded-none">
        <h3 className="text-xs font-bold uppercase tracking-tighter text-[#DFE104] mb-4">
          TOO LONG, DIDN'T READ? HERE'S THE SHORT VERSION:
        </h3>
        
        <div className="flex flex-col gap-3">
          {[
            "ScrollSense knows WHEN you scroll and HOW LONG, not WHAT you watched.",
            "YouTube video titles are classified then thrown away. Instagram reel URLs are discarded immediately.",
            "All Instagram processing happens in your browser. Raw files never reach our servers.",
            "You can delete everything — permanently, instantly — from the Delete Data section anytime."
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <ArrowRight className="w-[13px] h-[13px] text-[#DFE104] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#A1A1AA] leading-relaxed">
                {item}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="text-xs text-[#3F3F46] uppercase tracking-wider">
            STILL HAVE QUESTIONS?
          </div>
          <div className="text-xs text-[#3F3F46] mt-1">
            The Data Vault section shows your actual database record. Check it anytime.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyEducation;