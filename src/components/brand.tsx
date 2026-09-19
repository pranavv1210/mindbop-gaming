import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="MindBop home"
    >
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 3 25 11 35 9 32 19 38 26 28 29 25 38 17 32 7 35 9 25 2 18 12 14 14 4Z"
          fill="currentColor"
        />
        <path
          d="M15 18v4m10-4v4"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span>
        mindbop<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
