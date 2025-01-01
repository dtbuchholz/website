export function ArrowIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto mb-0 py-4">
      <div className="flex justify-between items-center">
        <ul className="text-theme-600 dark:text-theme-300">
          <li>
            <p className="h-7">© {new Date().getFullYear()} Dan Buchholz</p>
          </li>
        </ul>
        <ul className="flex flex-row space-x-4 text-theme-600 dark:text-theme-300">
          <li>
            <a
              className="flex items-center transition-all hover:text-theme-800 dark:hover:text-theme-100"
              rel="noopener noreferrer"
              target="_blank"
              href="/rss"
            >
              <p className="h-7 mr-1">rss</p>
              <ArrowIcon />
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
