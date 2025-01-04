"use client";

import Link from "next/link";
import { useState } from "react";
import { FaBars, FaGithub, FaXmark, FaXTwitter } from "react-icons/fa6";

const navItems = {
  "/blog": {
    name: "blog",
  },
  "/projects": {
    name: "projects",
  },
  "/about": {
    name: "about",
  },
};

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="mb-12 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav className="relative" id="nav">
          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-row items-start px-0 pb-0 fade md:overflow-auto scroll-pr-6">
            <div className="flex flex-row space-x-0 justify-between w-full">
              <div className="flex flex-row space-x-0">
                <Link
                  href="/"
                  className="flex items-center align-middle relative py-1 ml-0 pl-0 pr-2 m-1 font-bold text-lg leading-none"
                >
                  dan buchholz
                </Link>
                {Object.entries(navItems).map(([path, { name }]) => {
                  return (
                    <Link
                      key={path}
                      href={path}
                      className="transition-all relative flex items-center py-1 px-2 m-1 dark:text-theme-300 dark:hover:text-theme-100"
                    >
                      /{name}
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center">
                <SocialLinks />
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex justify-between items-center">
              <Link
                href="/"
                className="flex items-center align-middle relative py-1 ml-0 pl-0 pr-2 m-1 font-bold text-lg leading-none"
              >
                dan buchholz
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer transition-all p-2 text-theme-600 dark:text-theme-300 hover:text-theme-900 dark:hover:text-theme-100"
              >
                {isOpen ? <FaXmark size={24} /> : <FaBars size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
              <div className="z-10000 absolute top-full left-0 right-0 bg-theme-200 dark:bg-theme-800 border border-theme-400 dark:border-theme-700 rounded-lg mt-2 py-2 shadow-lg">
                <div className="flex flex-col">
                  {Object.entries(navItems).map(([path, { name }]) => (
                    <Link
                      key={path}
                      href={path}
                      onClick={() => setIsOpen(false)}
                      className="transition-all py-2 px-4 hover:bg-theme-300 dark:hover:bg-theme-700 dark:text-theme-300 dark:hover:text-theme-100"
                    >
                      /{name}
                    </Link>
                  ))}
                  <div className="border-t border-theme-400 dark:border-theme-700 mt-2 pt-2 px-4">
                    <SocialLinks />
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
}

function SocialLinks() {
  return (
    <>
      <a
        className="transition-all dark:text-theme-300 dark:hover:text-theme-100 flex items-center align-middle relative py-1 px-2 m-1"
        href="https://github.com/dtbuchholz"
        target="_blank"
        rel="noreferrer"
      >
        <FaGithub size={20} />
      </a>
      <a
        className="transition-all dark:text-theme-300 dark:hover:text-theme-100 flex align-middle relative py-1 px-2 m-1"
        href="https://twitter.com/dtbuchholz"
        target="_blank"
        rel="noreferrer"
      >
        <FaXTwitter size={20} />
      </a>
    </>
  );
}
