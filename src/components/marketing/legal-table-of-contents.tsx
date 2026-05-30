"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { LegalSection } from "@/content/marketing/types";

export function LegalTableOfContents({
  title,
  sections,
}: Readonly<{
  title: string;
  sections: LegalSection[];
}>) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element != null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label={title}
      className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:pt-12"
    >
      <p className="mb-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
        {title}
      </p>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              className={cn(
                "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                activeId === section.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              href={`#${section.id}`}
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
