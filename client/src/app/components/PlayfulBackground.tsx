import React from 'react';

export function PlayfulBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f3f4f6]">
      {/* Płynne bloby nadające klimat tłu */}
      <div className="absolute -top-[15%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-orange-500/20 blur-[100px]" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gray-900/10 blur-[120px]" />
      <div className="absolute top-[25%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-gray-400/20 blur-[80px]" />
      
      {/* Wyraźne kształty geometryczne dla "zabawowego" charakteru */}
      <div className="absolute top-[15%] right-[20%] w-16 h-16 bg-orange-500 rounded-2xl rotate-[15deg] opacity-80 shadow-lg" />
      <div className="absolute bottom-[20%] left-[15%] w-20 h-20 bg-gray-800 rounded-full opacity-90 shadow-xl" />
      <div className="absolute top-[10%] left-[12%] w-14 h-14 border-[6px] border-gray-400/60 rounded-full" />
      <div 
        className="absolute bottom-[18%] right-[12%] w-24 h-24 bg-orange-400 opacity-80 rotate-45 shadow-lg" 
        style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} 
      />
      <div className="absolute top-[40%] right-[5%] w-10 h-10 bg-gray-600 rounded-md -rotate-12 opacity-50 shadow-sm" />
    </div>
  );
}