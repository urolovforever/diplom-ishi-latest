import { useState, useEffect, useRef } from 'react';

export function useCountUp(end, duration = 1000) {
  const [value, setValue] = useState(0);
  const prevEnd = useRef(0);

  useEffect(() => {
    if (end == null || isNaN(end)) return;

    const start = prevEnd.current;
    prevEnd.current = end;
    const diff = end - start;
    if (diff === 0) { setValue(end); return; }

    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [end, duration]);

  return value;
}
