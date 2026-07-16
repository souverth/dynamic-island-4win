import { useState } from 'react';

export function useClickTracker() {
  const [clicks, setClicks] = useState<number>(() => {
    const val = localStorage.getItem('island_clicks_today');
    return val ? parseInt(val, 10) : 0;
  });

  const incrementClicks = () => {
    setClicks((prev) => {
      const next = prev + 1;
      localStorage.setItem('island_clicks_today', next.toString());
      return next;
    });
  };

  return { clicks, incrementClicks };
}
