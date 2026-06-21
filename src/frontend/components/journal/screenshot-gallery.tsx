"use client";

import React, { useState } from "react";
import { Maximize2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

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
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (screenshots.length === 0) {
    return (
      <div className="border border-dashed border-gray-850 rounded-lg p-10 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
        <ImageIcon className="h-8 w-8 text-gray-650" />
        <span>No screenshots uploaded for this trade.</span>
      </div>
    );
  }

  const activeImage = screenshots[activeIdx];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % screenshots.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <div className="space-y-4">
      {/* Large screenshot display */}
      <div className="border border-gray-850 bg-gray-950 rounded-lg overflow-hidden group relative flex flex-col">
        {/* Info bar */}
        <div className="flex justify-between items-center text-xs px-4 py-3 border-b border-gray-850 bg-gray-900/20">
          <span className="font-semibold text-gray-300 capitalize">
            {activeImage.type.toLowerCase().replace(/_/g, " ")} Chart
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {(activeImage.sizeBytes / 1024).toFixed(0)} KB
          </span>
        </div>

        {/* Image holder */}
        <div 
          onClick={() => setIsZoomed(true)}
          className="relative bg-gray-950 aspect-video max-h-[500px] w-full cursor-zoom-in flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage.url}
            alt={`${activeImage.type} Screenshot`}
            className="object-contain w-full h-full max-h-[500px]"
          />

          {/* Controls */}
          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-gray-900/80 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-gray-900/80 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Hover zoom overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-950/80 border border-gray-850 px-4 py-2 rounded-full text-white flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-sm">
              <Maximize2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold">Click to Zoom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Gallery Row */}
      {screenshots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {screenshots.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(idx)}
              className={`relative h-16 w-24 rounded border overflow-hidden shrink-0 transition ${
                idx === activeIdx 
                  ? "border-blue-500 ring-1 ring-blue-500" 
                  : "border-gray-850 hover:border-gray-700 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="thumbnail"
                className="object-cover h-full w-full"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-gray-300 py-0.5 text-center font-mono capitalize">
                {img.type.replace(/_/, " ").substring(0, 10)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
        >
          {/* Header */}
          <div className="flex justify-between items-center w-full max-w-7xl mx-auto py-2">
            <div className="text-left">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {screenshots[activeIdx].type.toLowerCase().replace(/_/g, " ")} Chart
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Image {activeIdx + 1} of {screenshots.length}
              </p>
            </div>
            <button 
              onClick={() => setIsZoomed(false)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-0 sm:left-4 z-10 h-12 w-12 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/50 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition hover:scale-105 backdrop-blur-sm"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Image display */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-[90vw] select-none rounded border border-gray-850 overflow-hidden shadow-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshots[activeIdx].url}
                alt="Full View"
                className="object-contain max-h-[85vh] max-w-[90vw] bg-black"
              />
            </div>

            {/* Next arrow */}
            {screenshots.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
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
