"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { canAccess, type Role } from "@/lib/roles";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => canAccess(role, i.area)),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3.5 z-30 rounded-md p-1.5 text-foreground hover:bg-sand lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/">
            <Image src="/brand/logo-mark.png" alt="Paula Chiaradia" width={900} height={205} className="w-44" priority />
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active ? "bg-sand font-medium text-foreground" : "text-muted hover:bg-sand/60 hover:text-foreground"
                        }`}
                      >
                        <Icon className={`size-[18px] ${active ? "text-accent" : ""}`} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
