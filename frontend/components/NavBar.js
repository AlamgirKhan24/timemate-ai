"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/services/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "WhatsApp" },
];

const hiddenOn = ["/", "/login", "/register"];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (hiddenOn.includes(pathname)) return null;

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <span className="font-semibold">TimeMate AI</span>
        <div className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "font-semibold text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="rounded-lg border border-gray-300 px-3 py-1">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
