"use client";

import { useEffect, useState } from "react";

type LoadingSpinnerProps = {
  time?: number;
};

export function LoadingSpinner({ time = 1000 }: LoadingSpinnerProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, time);

    return () => clearTimeout(timer);
  }, [time]);

  if (!show) return null;

  return (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-theme-200 border-t-transparent"></div>
  );
}
