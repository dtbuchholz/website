"use client";

import { useEffect, useRef, useState } from "react";

import { LoadingSpinner } from "@/components/loading";

interface FileViewerProps {
  path: string;
  onClose: () => void;
}

export function FileViewer({ path, onClose }: FileViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        setContent(data[0]?.fileContents || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [path]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // Prevent other handlers from catching this
        e.stopPropagation(); // Stop event bubbling
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase to handle the event before it reaches the terminal
    document.addEventListener("keydown", handleEscape, true);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        setContent(data[0]?.fileContents || "");
      } catch (err) {
        setError(err.message);
      }
    };
    fetchContent();
  }, [path]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50">
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl h-[80vh] bg-theme-950 rounded-lg flex flex-col shadow-lg shadow-theme-950"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-2">
          <span className="text-theme-200 text-sm">{path}</span>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 cursor-pointer transition-all rounded-md p-1 inline-flex items-center justify-center dark:text-theme-300 dark:hover:text-theme-100 focus:outline-non"
          >
            <span className="sr-only">Close menu</span>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="border-b border-theme-900" />
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 bg-theme-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <pre className="whitespace-pre-wrap">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
