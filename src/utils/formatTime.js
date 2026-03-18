export function formatMinutes(mins) {
  if (mins < 60) return `${mins} MIN`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} HR` : `${h} HR ${m} MIN`;
}

export function formatTimeSeconds(totalSeconds) {
  if (totalSeconds < 60) {
    const s = String(totalSeconds).padStart(2, '0');
    return `00:${s}`;
  } else if (totalSeconds < 3600) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  } else {
    const h = Math.floor(totalSeconds / 3600);
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
