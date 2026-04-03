import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useSessionTimer() {
  const [timerState, setTimerState] = useLocalStorage('scrollsense_timer', {
    isRunning: false,
    startTime: null,
    todayMinutes: 0,
    lastResetDate: new Date().toDateString(),
  });

  const [onboardingData] = useLocalStorage('scrollsense_onboarding', {});
  const dailyLimitMinutes = onboardingData?.dailyLimit ? parseInt(onboardingData.dailyLimit, 10) : 90;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Handle cross-day reset
  useEffect(() => {
    const today = new Date().toDateString();
    if (timerState.lastResetDate !== today) {
      setTimerState(prev => ({
        ...prev,
        todayMinutes: 0,
        lastResetDate: today,
        isRunning: false,
        startTime: null
      }));
    }
  }, [timerState.lastResetDate, setTimerState]);

  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      const start = new Date(timerState.startTime).getTime();
      
      const updateElapsed = () => {
        const now = new Date().getTime();
        const diffInSeconds = Math.floor((now - start) / 1000);
        setElapsedSeconds(diffInSeconds);
      };

      updateElapsed(); // Initial call
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState.isRunning, timerState.startTime]);

  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: new Date().toISOString()
    }));
  };

  const stopTimer = () => {
    const sessionMinutes = Math.floor(elapsedSeconds / 60);
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
      todayMinutes: prev.todayMinutes + sessionMinutes
    }));
    return sessionMinutes;
  };

  const resetToday = () => {
    setTimerState(prev => ({
      ...prev,
      todayMinutes: 0,
    }));
  };

  const percentUsed = Math.min((timerState.todayMinutes / dailyLimitMinutes) * 100, 100);
  const isOverLimit = timerState.todayMinutes >= dailyLimitMinutes;

  return {
    isRunning: timerState.isRunning,
    elapsedSeconds,
    todayMinutes: timerState.todayMinutes,
    dailyLimitMinutes,
    percentUsed,
    isOverLimit,
    startTimer,
    stopTimer,
    resetToday
  };
}
