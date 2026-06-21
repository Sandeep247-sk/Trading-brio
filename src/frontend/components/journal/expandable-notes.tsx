"use client";

import React, { useState, useRef, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableNotesProps {
  notes: string | null;
}

export function ExpandableNotes({ notes }: ExpandableNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // If content height exceeds 120px, show the expandable button
      if (contentRef.current.scrollHeight > 120) {
        setShouldShowButton(true);
      }
    }
  }, [notes]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const displayText = notes || "No notes written for this trade entry.";

  return (
    <div className="bg-gray-950 border border-gray-850 p-6 rounded-lg space-y-3 relative overflow-hidden transition-all duration-300 hover:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-gray-500" />
        Journal Notes & Context
      </h3>
      
      <div 
        ref={contentRef}
        style={{ maxHeight: isExpanded ? "none" : "120px" }}
        className={`text-sm text-gray-300 whitespace-pre-wrap leading-relaxed overflow-hidden transition-all duration-300 ${
          !isExpanded && shouldShowButton ? "relative" : ""
        }`}
      >
        {displayText}
        
        {/* Bottom fade if truncated */}
        {!isExpanded && shouldShowButton && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
        )}
      </div>

      {shouldShowButton && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-1.5 px-3 py-1 bg-gray-900/50 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-400 hover:text-white rounded-md transition duration-200"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Read More</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
