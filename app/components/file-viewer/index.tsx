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
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return "48rem";
    return window.innerWidth < 768 ? `${window.innerWidth}px` : "48rem";
  });
  const currentWidthRef = useRef(width);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Handle window resize
  // TODO: resizing the window while the drawer is open is jittery
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // On mobile, use full width
        setWidth(`${window.innerWidth}px`);
        currentWidthRef.current = `${window.innerWidth}px`;
      } else if (currentWidthRef.current.includes("px")) {
        // If width is in pixels (from either mobile or manual resize)
        const currentWidth = parseInt(currentWidthRef.current);
        if (currentWidth > window.innerWidth) {
          // If drawer is wider than viewport, constrain it
          setWidth(`${window.innerWidth}px`);
          currentWidthRef.current = `${window.innerWidth}px`;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update ref when width changes
  useEffect(() => {
    currentWidthRef.current = width;
  }, [width]);

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = window.innerWidth < 768 ? window.innerWidth : 400;
      const maxWidth = window.innerWidth - 100;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(`${clampedWidth}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

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
        style={{ width }}
        className={`absolute right-0 top-0 h-full bg-theme-950 ${
          isResizing
            ? ""
            : "transition-transform duration-300 ease-in-out transform" +
              ` ${isOpen ? "translate-x-0" : "translate-x-full"}`
        }`}
      >
        {/* Resize Handle */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-theme-400`}
          onMouseDown={() => setIsResizing(true)}
        />
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-theme-900">
          <span className="text-theme-200 text-sm font-mono truncate">{path}</span>
          <button
            onClick={handleClose}
            className="p-2 cursor-pointer text-theme-300 hover:text-theme-100 transition-colors"
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
