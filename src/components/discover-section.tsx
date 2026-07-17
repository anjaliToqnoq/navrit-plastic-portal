"use client";

import Link from "next/link";
import { useLocale } from "./locale-provider";
import type { Article } from "@/lib/articles";
import { ArrowRight, Clock } from "lucide-react";

export function DiscoverSection({ articles }: { articles: Article[] }) {
  const { locale } = useLocale();

  return (
    <section className="py-16 sm:py-20">
      <div className="container-premium">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16a34a]">
              {locale === "hi" ? "इनसाइट्स" : "Insights"}
            </p>
            <h2 className="mt-2 font-display text-3xl text-[var(--nv-text)] sm:text-4xl">
              {locale === "hi" ? "लेख" : "From the journal"}
            </h2>
          </div>
          <Link href="/articles" className="btn-ghost">
            {locale === "hi" ? "सभी देखें" : "All articles"}
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {articles.slice(0, 3).map((a, i) => {
            const title = locale === "hi" ? a.title_hi : a.title_en;
            const excerpt = locale === "hi" ? a.excerpt_hi : a.excerpt_en;
            const mins = Math.max(2, Math.ceil((excerpt?.length || 120) / 90));
            return (
              <article
                key={a.id}
                className="article-card animate-card"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <Link href={`/articles/${a.slug}`} className="media block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.image_url || "/articles/rates.svg"}
                    alt=""
                    loading="lazy"
                  />
                  <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#14532d]">
                    Recycling
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-[var(--nv-muted)]">
                    <Clock size={12} />
                    {mins} {locale === "hi" ? "मिनट पढ़ें" : "min read"}
                    <span>·</span>
                    {a.published_at
                      ? new Date(a.published_at + "T12:00:00").toLocaleDateString(
                          locale === "hi" ? "hi-IN" : "en-IN",
                          { day: "2-digit", month: "short" }
                        )
                      : ""}
                  </div>
                  <h3 className="mt-2 font-display text-lg leading-snug text-[var(--nv-text)]">
                    <Link href={`/articles/${a.slug}`} className="hover:text-[#16a34a]">
                      {title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--nv-muted)]">
                    {excerpt}
                  </p>
                  <Link href={`/articles/${a.slug}`} className="btn-ghost mt-4">
                    {locale === "hi" ? "पढ़ें" : "Read article"}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
