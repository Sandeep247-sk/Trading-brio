"use client";

import React, { useState } from "react";
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Screenshot {
  id: string;
  url: string;
  type: string;
  sizeBytes: number;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="border border-dashed border-gray-850 rounded-lg p-10 text-center text-xs text-gray-500">
        No screenshots uploaded for this trade.
      </div>
    );
  }

  const openModal = (idx: number) => {
    setActiveIdx(idx);
  };

  const closeModal = () => {
    setActiveIdx(null);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx !== null) {
      setActiveIdx((activeIdx + 1) % screenshots.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIdx !== null) {
      setActiveIdx((activeIdx - 1 + screenshots.length) % screenshots.length);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6">
        {screenshots.map((img, idx) => (
          <div key={img.id} className="border border-gray-850 bg-gray-900/10 p-3 rounded-lg space-y-2 group">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-400 capitalize">
                {img.type.toLowerCase().replace(/_/g, " ")} chart
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {(img.sizeBytes / 1024).toFixed(0)} KB
              </span>
            </div>
            
            <div 
              onClick={() => openModal(idx)}
              className="relative rounded overflow-hidden border border-gray-800 bg-gray-950 aspect-video max-h-[480px] cursor-zoom-in group/img"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`${img.type} Screenshot`}
                className="object-contain w-full h-full transition duration-300 group-hover:scale-[1.01]"
              />
              
              {/* Full screen hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition duration-200 flex items-center justify-center">
                <div className="bg-gray-950/80 border border-gray-850 p-2.5 rounded-full text-white flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-sm">
                  <Maximize2 className="h-4 w-4" />
                  <span className="text-xs font-semibold pr-1">Full View</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Full View Modal */}
      {activeIdx !== null && (
        <div 
          onClick={closeModal}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
        >
          {/* Header */}
          <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-2">
            <div className="text-left">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {screenshots[activeIdx].type.toLowerCase().replace(/_/g, " ")} chart
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Image {activeIdx + 1} of {screenshots.length}
              </p>
            </div>
            <button 
              onClick={closeModal}
              className="h-10 w-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition hover:scale-105"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Image content area */}
          <div className="flex-1 flex items-center justify-center relative max-w-7xl mx-auto w-full px-4 sm:px-12 my-4">
            {/* Prev arrow */}
            {screenshots.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-0 sm:left-4 z-10 h-12 w-12 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition hover:scale-105 backdrop-blur-sm"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Image display */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[80vh] max-w-[90vw] select-none rounded border border-gray-850 overflow-hidden shadow-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshots[activeIdx].url}
                alt="Full View"
                className="object-contain max-h-[80vh] max-w-[90vw] bg-black"
              />
            </div>

            {/* Next arrow */}
            {screenshots.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-0 sm:right-4 z-10 h-12 w-12 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition hover:scale-105 backdrop-blur-sm"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Footer stats */}
          <div className="text-center text-xs text-gray-500 font-mono py-2">
            File Size: {(screenshots[activeIdx].sizeBytes / 1024).toFixed(0)} KB • Click anywhere to exit
          </div>
        </div>
      )}
    </div>
  );
}
