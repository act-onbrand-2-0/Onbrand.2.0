'use client';

import React from 'react';

type ButtonLinkoutProps = {
  className?: string;
  state?: "Default" | "Hover";
  children?: React.ReactNode;
  onClick?: () => void;
};

export default function ButtonLinkout({ 
  className, 
  state = "Default", 
  children = "Learn More",
  onClick 
}: ButtonLinkoutProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 ${className}`}
    >
      <p className="font-bold leading-[1.4] text-[14px] text-center text-nowrap tracking-[-0.35px]">
        {children}
      </p>
      <div className="flex items-center h-full">
        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 5L5 1M5 1H1M5 1V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}
