"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaXmark } from "react-icons/fa6";

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
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Wait for animation to complete before unmounting
    setTimeout(onClose, 300); // Match duration-300
  }, [onClose]);

  useEffect(() => {
    // Trigger the animation after mount
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, []);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [onClose, handleClose]);

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

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-neutral-950/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        ref={contentRef}
        className={`absolute right-0 top-0 h-full w-full md:w-[48rem] bg-theme-950 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-theme-900">
          <span className="text-theme-200 text-sm font-mono truncate">{path}</span>
          <button
            onClick={handleClose}
            className="p-2 text-theme-300 hover:text-theme-100 transition-colors"
          >
            <FaXmark size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-4rem)] overflow-auto p-4 bg-theme-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
