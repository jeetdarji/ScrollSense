import React, { useEffect, useState } from 'react';
import DashboardNav from '../components/dashboard/DashboardNav';
import GroupFinder from '../components/community/GroupFinder';
import MyGroup from '../components/community/MyGroup';
import WeeklySubmission from '../components/community/WeeklySubmission';
import GroupFeed from '../components/community/GroupFeed';
import AnonymityExplainer from '../components/community/AnonymityExplainer';

const ANONYMOUS_NAMES = [
  'Quiet Fox', 'Silver Wolf', 'Amber Crane', 'Dark Tide',
  'Calm Ridge', 'Still Hawk', 'Iron Reed', 'Pale Dawn',
  'Slow River', 'Dim Star', 'Grey Moth', 'Black Fern',
  'Cold Ash', 'Swift Dune', 'Deep Moss', 'Hollow Wind',
];

const OPEN_GROUPS = [
  {
    id: 'og_late_night',
    type: 'open',
    category: 'late_night_scrollers',
    displayName: 'LATE NIGHT SCROLLERS',
    description: 'For people whose worst scrolling happens after 10pm. We track together, no judgment.',
    memberCount: 14,
    icon: 'Moon',
    triggerPattern: 'late_night',
    weeklyAvgImprovement: -12,
  },
  {
    id: 'og_morning',
    type: 'open',
    category: 'morning_habit_builders',
    displayName: 'MORNING HABIT BUILDERS',
    description: 'Opening apps before getting out of bed. We are working on this together.',
    memberCount: 9,
    icon: 'Sun',
    triggerPattern: 'morning',
    weeklyAvgImprovement: -8,
  },
  {
    id: 'og_stress',
    type: 'open',
    category: 'stress_scrollers',
    displayName: 'STRESS SCROLLERS',
    description: 'Using Instagram as an escape from anxiety or pressure. We see you.',
    memberCount: 17,
    icon: 'Zap',
    triggerPattern: 'stressed',
    weeklyAvgImprovement: -15,
  },
  {
    id: 'og_boredom',
    type: 'open',
    category: 'boredom_browsers',
    displayName: 'BOREDOM BROWSERS',
    description: 'The habit scroll. Nothing to do, so you open the app. We are tracking this pattern.',
    memberCount: 22,
    icon: 'Meh',
    triggerPattern: 'boredom',
    weeklyAvgImprovement: -10,
  },
  {
    id: 'og_procrastination',
    type: 'open',
    category: 'procrastination_scrollers',
    displayName: 'PROCRASTINATION SCROLLERS',
    description: 'The "quick break" that turns into an hour. Avoiding something important. We are here.',
    memberCount: 11,
    icon: 'Timer',
    triggerPattern: 'procrastinating',
    weeklyAvgImprovement: -18,
  },
  {
    id: 'og_placement',
    type: 'open',
    category: 'goal_focused',
    displayName: 'GOAL FOCUSED',
    description: 'Working toward something specific — career, fitness, creative work. Scroll less, do more.',
    memberCount: 8,
    icon: 'Target',
    triggerPattern: 'general',
    weeklyAvgImprovement: -20,
  },
  {
    id: 'og_weekend',
    type: 'open',
    category: 'weekend_spirals',
    displayName: 'WEEKEND SPIRALS',
    description: 'Friday night through Sunday — when all the scrolling happens. We track weekends together.',
    memberCount: 16,
    icon: 'Calendar',
    triggerPattern: 'late_night',
    weeklyAvgImprovement: -9,
  },
  {
    id: 'og_eating',
    type: 'open',
    category: 'meal_time_scrollers',
    displayName: 'MEAL TIME SCROLLERS',
    description: 'Every meal comes with a phone. Working on being present at the table.',
    memberCount: 7,
    icon: 'Coffee',
    triggerPattern: 'eating',
    weeklyAvgImprovement: -14,
  },
];

const MOCK_GROUP_FEED = [
  { anonymousName: 'Quiet Fox',   improvementMinutes: 68, improvementPct: 18, isMe: true,  submitted: true  },
  { anonymousName: 'Silver Wolf', improvementMinutes: 45, improvementPct: 12, isMe: false, submitted: true  },
  { anonymousName: 'Amber Crane', improvementMinutes: -20, improvementPct: -5, isMe: false, submitted: true  },
  { anonymousName: 'Dark Tide',   improvementMinutes: 90, improvementPct: 24, isMe: false, submitted: true  },
  { anonymousName: 'Calm Ridge',  improvementMinutes: 0,  improvementPct: 0,  isMe: false, submitted: false },
  { anonymousName: 'Still Hawk',  improvementMinutes: 30, improvementPct: 8,  isMe: false, submitted: true  },
];

const readStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
};

export default function CommunityPage() {
  const [myGroup, setMyGroup] = useState(null);
  const [weeklySub, setWeeklySub] = useState(null);
  const [groupFeed, setGroupFeed] = useState(MOCK_GROUP_FEED);

  useEffect(() => {
    const mg = readStorage('scrollsense_my_group');
    const ws = readStorage('scrollsense_weekly_sub');
    const gf = readStorage('scrollsense_group_feed');

    if (mg) setMyGroup(mg);
    if (ws) setWeeklySub(ws);
    if (gf) setGroupFeed(gf);
  }, []);

  const hasGroup = myGroup !== null;

  return (
    <>
      <DashboardNav />
      <div className="pt-[56px] min-h-screen bg-[#09090B] relative">
        <div 
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        ></div>

        <div className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl mx-auto px-4 py-8 md:py-12 relative z-10">
          <p className="text-xs uppercase tracking-widest text-[#DFE104] mb-2">
            ACCOUNTABILITY GROUPS
          </p>
          <h1 
            style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}
            className="font-bold uppercase tracking-tighter leading-[0.85] text-[#FAFAFA]"
          >
            YOU'RE NOT SCROLLING ALONE.
          </h1>
          <p className="mt-3 text-sm md:text-base text-[#A1A1AA] max-w-2xl leading-relaxed">
            Small anonymous groups. One number per week. No names. No judgment. Just shared progress.
          </p>

          <div className="border-b-2 border-[#3F3F46] mt-6 mb-10"></div>

          {!hasGroup ? (
            <>
              <AnonymityExplainer />
              <GroupFinder openGroups={OPEN_GROUPS} anonymousNames={ANONYMOUS_NAMES} />
            </>
          ) : (
            <>
              <MyGroup group={myGroup} />
              <WeeklySubmission group={myGroup} weeklySub={weeklySub} />
              <GroupFeed group={myGroup} feed={groupFeed} />
              <AnonymityExplainer />
            </>
          )}
        </div>
      </div>
    </>
  );
}
