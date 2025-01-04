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
          {/* Desktop navigation */}
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

          {/* Mobile navigation */}
          <div className="md:hidden">
            <div className="flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="py-2 pl-0 mr-4 text-theme-600 dark:text-theme-300 cursor-pointer transition-all hover:text-theme-900 dark:hover:text-theme-100"
              >
                <FaBars size={24} />
              </button>
              <Link
                href="/"
                className="flex items-center align-middle relative py-1 ml-0 pl-0 pr-2 m-1 font-bold text-lg leading-none"
              >
                dan buchholz
              </Link>
            </div>

            {/* Slide-out Menu */}
            <div
              className={`fixed inset-0 z-50 ${
                isOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
            >
              {/* Overlay */}
              <div
                className={`fixed inset-0 bg-neutral-950/50 transition-opacity duration-300 ${
                  isOpen ? "opacity-100" : "opacity-0"
                }`}
                onClick={() => setIsOpen(false)}
              />

              {/* Drawer */}
              <div
                className={`absolute left-0 top-0 h-full w-64 bg-theme-100 dark:bg-theme-900 shadow-lg transform transition-transform duration-300 ease-in-out ${
                  isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-8">
                    <Link href="/" onClick={() => setIsOpen(false)} className="font-bold text-lg">
                      dan buchholz
                    </Link>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 text-theme-600 dark:text-theme-300 cursor-pointer transition-all hover:text-theme-900 dark:hover:text-theme-100"
                    >
                      <FaXmark size={24} />
                    </button>
                  </div>
                  <div className="flex flex-col space-y-4">
                    {Object.entries(navItems).map(([path, { name }]) => (
                      <Link
                        key={path}
                        href={path}
                        onClick={() => setIsOpen(false)}
                        className="transition-all py-2 hover:text-theme-900 dark:text-theme-300 dark:hover:text-theme-100"
                      >
                        /{name}
                      </Link>
                    ))}
                    <div className="pt-4 mt-4 border-t border-theme-400 dark:border-theme-700">
                      <div className="flex space-x-4">
                        <SocialLinks />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
