import Link from "next/link";

import { FaGithub, FaXTwitter } from "react-icons/fa6";

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
  return (
    <aside className="mb-12 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
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
                    className="transition-all relative flex items-center py-1 px-2 m-1 dark:text-theme-300 dark:hover:text-theme-100" // after:absolute after:bottom-0 after:left-0 after:h-[0.5px] after:w-0 hover:after:w-full after:transition-all after:bg-current
                  >
                    /{name}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center">
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
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
