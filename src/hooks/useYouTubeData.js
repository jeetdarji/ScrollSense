export function useYouTubeData() {
  return {
    isConnected: true,
    isLoading: false,
    isClassifying: false,

    weeklyBreakdown: [
      { week: 'W1', weekStart: '2025-01-06', goal: 6, interest: 32, junk: 62, totalMinutes: 480 },
      { week: 'W2', weekStart: '2025-01-13', goal: 7, interest: 30, junk: 63, totalMinutes: 460 },
      { week: 'W3', weekStart: '2025-01-20', goal: 8, interest: 34, junk: 58, totalMinutes: 430 },
      { week: 'W4', weekStart: '2025-01-27', goal: 9, interest: 36, junk: 55, totalMinutes: 400 },
      { week: 'W5', weekStart: '2025-02-03', goal: 11, interest: 35, junk: 54, totalMinutes: 390 },
      { week: 'W6', weekStart: '2025-02-10', goal: 12, interest: 37, junk: 51, totalMinutes: 360 },
      { week: 'W7', weekStart: '2025-02-17', goal: 14, interest: 38, junk: 48, totalMinutes: 312 },
    ],

    currentWeek: {
      goal: 14,
      interest: 38,
      junk: 48,
      totalMinutes: 312,
      totalVideos: 47,
      changeVsLastWeek: {
        goal: +2,
        interest: +1,
        junk: -3,
        totalMinutes: -48,
      },
      hasEnoughDataForTrend: true,
      weeksOfData: 7,
    },

    goalScoreHistory: [
      { week: 'W1', score: 6 },
      { week: 'W2', score: 7 },
      { week: 'W3', score: 8 },
      { week: 'W4', score: 9 },
      { week: 'W5', score: 11 },
      { week: 'W6', score: 12 },
      { week: 'W7', score: 14 },
    ],

    topChannels: [
      { name: 'Channel A', category: 'goal', minutes: 85 },
      { name: 'Channel B', category: 'interest', minutes: 62 },
      { name: 'Channel C', category: 'junk', minutes: 58 },
      { name: 'Channel D', category: 'junk', minutes: 44 },
      { name: 'Channel E', category: 'interest', minutes: 38 },
    ],

    contentSuggestions: [
      { name: 'Suggested Channel 1', reason: 'Matches your focus area' },
      { name: 'Suggested Channel 2', reason: 'Popular in your field' },
      { name: 'Suggested Channel 3', reason: 'Trending this week' },
    ],

    checkin: {
      available: true,
      isFirstCheckin: false,
      triggerReason: 'sessions',
      sessionsLogged: 4,
      generatedAt: '2025-02-17T18:00:00Z',
      weekStart: '2025-02-10',
      totalScrollMinutes: 312,
      platformBreakdown: { youtube: 68, instagram: 32 },
      goalPercent: 14,
      improvementMinutes: 48,
      mostCommonTrigger: 'BOREDOM',
      heaviestScrollDay: 'SUNDAY',
      timeReclaimedMinutes: 108,
      aiInsight: 'Your Sunday evening sessions are consistently your longest. Consider setting a stricter personal limit specifically for Sunday evenings.',
      interestBudgetStatus: 'You stayed within budget on 3 of 5 interests this week.',
    },

    interests: [
      { id: 'cricket', label: 'Cricket', dailyBudgetMinutes: 30, consumedMinutes: 28, weeklyAvgMinutes: 31, status: 'near_limit' },
      { id: 'music', label: 'Music', dailyBudgetMinutes: 20, consumedMinutes: 8, weeklyAvgMinutes: 15, status: 'on_track' },
      { id: 'gaming', label: 'Gaming', dailyBudgetMinutes: 45, consumedMinutes: 62, weeklyAvgMinutes: 58, status: 'over' },
      { id: 'fitness', label: 'Fitness', dailyBudgetMinutes: 15, consumedMinutes: 4, weeklyAvgMinutes: 6, status: 'on_track' },
      { id: 'finance', label: 'Finance', dailyBudgetMinutes: 20, consumedMinutes: 0, weeklyAvgMinutes: 2, status: 'on_track' },
    ],
  };
}