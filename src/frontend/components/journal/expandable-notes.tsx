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
    <div className="bg-card border border-border p-6 rounded-lg space-y-3 relative overflow-hidden transition-all duration-300 hover:border-border">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        Journal Notes & Context
      </h3>
      
      <div 
        ref={contentRef}
        style={{ maxHeight: isExpanded ? "none" : "120px" }}
        className={`text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed overflow-hidden transition-all duration-300 ${
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
            className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 hover:bg-muted border border-border hover:border-border text-xs font-semibold text-muted-foreground hover:text-white rounded-md transition duration-200"
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
