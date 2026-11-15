"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@/services/api";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/recurring", label: "Recurring", icon: "repeat" },
  { href: "/assistant", label: "Assistant", icon: "sparkles" },
  { href: "/analytics", label: "Reports", icon: "chart" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/settings", label: "WhatsApp", icon: "message" },
  { href: "/profile", label: "Profile", icon: "user" },
];

const mobileLinks = [links[0], links[1], links[3], links[4]];
const moreLinks = links.filter((link) => !mobileLinks.includes(link));
const hiddenOn = ["/", "/login", "/register"];

function Icon({ name, className = "h-5 w-5" }) {
  const shared = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const drawings = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2M14 13h2M8 17h2"/></>,
    repeat: <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7L5 2Z"/></>,
    chart: <><path d="M4 19.5h16"/><path d="M6.5 16V10M12 16V5M17.5 16v-4"/></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.3-4.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>,
  };

  return <svg {...shared}>{drawings[name]}</svg>;
}

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavBar({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const showNavigation = !hiddenOn.includes(pathname);
  const moreActive = moreLinks.some((link) => isActive(pathname, link.href));

  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("timemate-theme");
    if (savedTheme === "light") {
      document.documentElement.dataset.theme = "light";
      setIsLight(true);
    }
  }, []);

  function handleLogout() {
    logoutUser().finally(() => router.push("/login"));
  }

  function toggleTheme() {
    const nextIsLight = !isLight;
    setIsLight(nextIsLight);
    document.documentElement.dataset.theme = nextIsLight ? "light" : "dark";
    window.localStorage.setItem("timemate-theme", nextIsLight ? "light" : "dark");
  }

  const iconLinkClass = (active) =>
    `group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
      active ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return <>
    {showNavigation && <>
      <aside aria-label="Main navigation" className="fixed inset-y-4 left-4 z-40 hidden w-14 flex-col items-center rounded-[28px] border border-gray-200/90 bg-white/95 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.10)] backdrop-blur md:flex">
        <Link href="/dashboard" aria-label="TimeMate dashboard" title="TimeMate AI" className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-bold tracking-tight text-white shadow-sm">
          TM
        </Link>
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2 py-1">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return <Link key={link.href} href={link.href} aria-label={link.label} aria-current={active ? "page" : undefined} className={iconLinkClass(active)}>
              <Icon name={link.icon}/>
              <span role="tooltip" className="pointer-events-none invisible absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                {link.label}
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900"/>
              </span>
            </Link>;
          })}
        </div>
        <button type="button" onClick={toggleTheme} aria-label={`Switch to ${isLight ? "dark" : "light"} theme`} aria-pressed={isLight} className={`${iconLinkClass(false)} mb-2`}>
          <Icon name={isLight ? "moon" : "sun"}/>
          <span role="tooltip" className="pointer-events-none invisible absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
            Switch to {isLight ? "dark" : "light"} theme
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900"/>
          </span>
        </button>
        <button type="button" onClick={handleLogout} aria-label="Log out" className={iconLinkClass(false)}>
          <Icon name="logout"/>
          <span role="tooltip" className="pointer-events-none invisible absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
            Log out
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900"/>
          </span>
        </button>
      </aside>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-around">
          {mobileLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return <Link key={link.href} href={link.href} aria-label={link.label} title={link.label} aria-current={active ? "page" : undefined} className={`flex h-11 w-12 items-center justify-center rounded-xl transition-colors ${active ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}>
              <Icon name={link.icon}/>
            </Link>;
          })}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-label="More navigation" aria-expanded={moreOpen} title="More" className={`flex h-11 w-12 items-center justify-center rounded-xl transition-colors ${moreActive || moreOpen ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}>
            <Icon name="more"/>
          </button>
        </div>
        {moreOpen && <div className="absolute bottom-[calc(100%+0.5rem)] right-3 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          {moreLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-blue-50 font-medium text-blue-600" : "text-gray-700 hover:bg-gray-50"}`}>
              <Icon name={link.icon} className="h-4 w-4"/>{link.label}
            </Link>;
          })}
          <button type="button" onClick={toggleTheme} aria-pressed={isLight} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
            <Icon name={isLight ? "moon" : "sun"} className="h-4 w-4"/>{isLight ? "Dark theme" : "Light theme"}
          </button>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
            <Icon name="logout" className="h-4 w-4"/>Log out
          </button>
        </div>}
      </nav>
    </>}
    <div className={showNavigation ? "min-h-screen flex-1 pb-20 md:pb-0 md:pl-24" : "min-h-screen flex-1"}>
      {children}
    </div>
  </>;
}
