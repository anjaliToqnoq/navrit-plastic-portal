"use client";

import { Recycle, Scale, FileCheck, Handshake } from "lucide-react";
import { useLocale } from "./locale-provider";

export function InnovateSection() {
  const { locale } = useLocale();

  const steps = [
    {
      icon: Recycle,
      title: locale === "hi" ? "संग्रह" : "Collect",
      body:
        locale === "hi"
          ? "स्थानीय वेंडरों से प्लास्टिक एकत्र।"
          : "Source plastic from trusted local vendors.",
    },
    {
      icon: Scale,
      title: locale === "hi" ? "तौल व ग्रेड" : "Weigh & grade",
      body:
        locale === "hi"
          ? "सामग्री का प्रकार और गुणवत्ता जाँच।"
          : "Sort by material type and quality grade.",
    },
    {
      icon: FileCheck,
      title: locale === "hi" ? "दैनिक रेट" : "Publish rates",
      body:
        locale === "hi"
          ? "हर दिन पारदर्शी खरीद रेट प्रकाशित।"
          : "Publish transparent purchase rates every day.",
    },
    {
      icon: Handshake,
      title: locale === "hi" ? "मूल्य बनाना" : "Create value",
      body:
        locale === "hi"
          ? "कचरे को संसाधन में बदलना।"
          : "Turn waste streams into reusable resources.",
    },
  ];

  return (
    <section className="border-y border-[var(--nv-border)] bg-white/50 py-16 dark:bg-white/[0.02] sm:py-20">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16a34a]">
            {locale === "hi" ? "हमारा दृष्टिकोण" : "How NAVRIT works"}
          </p>
          <h2 className="mt-3 font-display text-3xl text-[var(--nv-text)] sm:text-5xl">
            {locale === "hi" ? (
              "कचरे को मूल्य में बदलना"
            ) : (
              <>
                Waste into{" "}
                <span className="bg-gradient-to-r from-[#16a34a] to-[#84cc16] bg-clip-text text-transparent">
                  value
                </span>
              </>
            )}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--nv-muted)]">
            {locale === "hi"
              ? "संग्रह, छँटाई और दैनिक प्रकाशित रेट — NAVRIT प्लास्टिक को संसाधन बनाता है।"
              : "Collection, sorting, and daily published rates — NAVRIT turns plastic into a resource communities can trust."}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <article
              key={s.title}
              className="card-premium animate-card p-5"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="stat-icon">
                <s.icon size={18} />
              </div>
              <p className="mt-4 text-xs font-bold text-[#84cc16]">0{i + 1}</p>
              <h3 className="mt-1 font-display text-xl text-[var(--nv-text)]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--nv-muted)]">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
