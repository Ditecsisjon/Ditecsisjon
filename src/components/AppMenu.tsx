"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Inbox,
  LayoutDashboard,
  KanbanSquare,
  Send,
  X,
  LogOut,
  Wand2,
  MessageSquare,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Inkorg", icon: Inbox },
  { href: "/oversikt", label: "Översikt", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/follow-up", label: "Uppföljningar", icon: Send },
  { href: "/kampanjer", label: "SMS-kampanj", icon: MessageSquare },
  { href: "/mallar", label: "Svarsmallar", icon: Wand2 },
];

/** Diskret flytande meny för att nå appens vyer utan fast sidomeny. */
export function AppMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Visa inte menyn på inloggningssidan
  if (pathname === "/login") return null;

  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="mb-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">Meny</span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          </div>
          <nav className="p-1.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={17} /> {label}
                </Link>
              );
            })}
            <button
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut size={17} /> Logga ut
            </button>
          </nav>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        title="Meny"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700"
      >
        <Menu size={19} />
      </button>
    </div>
  );
}
