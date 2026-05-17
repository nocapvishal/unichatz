"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on chat page
  if (pathname.startsWith("/chat")) return null;

  return (
    <footer className="text-xs border-t border-black/5 dark:border-white/10 py-6 flex flex-wrap justify-center gap-6 opacity-50 backdrop-blur-xl bg-white/40 dark:bg-black/40 transition-all duration-300">

      <Link href="/legal/terms" className="hover:opacity-80 transition">
        Terms
      </Link>

      <Link href="/legal/privacy" className="hover:opacity-80 transition">
        Privacy
      </Link>

      <Link href="/legal/guidelines" className="hover:opacity-80 transition">
        Guidelines
      </Link>

      <span>© Blind Chat</span>

    </footer>
  );
}