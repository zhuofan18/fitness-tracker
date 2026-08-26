"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/log/new", label: "Log Food" },
  { href: "/saved-foods", label: "Saved" },
  { href: "/history", label: "History" },
  { href: "/stats", label: "Stats" },
  { href: "/plan", label: "Plan" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex gap-4 overflow-x-auto text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "font-semibold underline"
                  : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="shrink-0 text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
