"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import type { Article } from "@/lib/articles";
import { ArrowLeft, Clock, Share2 } from "lucide-react";

export function ArticleDetailClient({ article }: { article: Article }) {
  const { locale } = useLocale();
  const title = locale === "hi" ? article.title_hi : article.title_en;
  const body = locale === "hi" ? article.body_hi : article.body_en;
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  const mins = Math.max(3, Math.ceil(body.length / 900));

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* cancelled */
    }
  }

  return (
    <article>
      <div className="relative h-56 overflow-hidden sm:h-72 md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.image_url || "/articles/rates.svg"}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 via-[#0f172a]/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container-premium pb-8">
            <p className="text-sm font-medium text-lime-300">
              {article.published_at
                ? new Date(article.published_at + "T12:00:00").toLocaleDateString(
                    locale === "hi" ? "hi-IN" : "en-IN",
                    { day: "2-digit", month: "long", year: "numeric" }
                  )
                : ""}
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
              {title}
            </h1>
          </div>
        </div>
      </div>

      <div className="container-premium max-w-3xl py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/articles" className="btn-ghost">
            <ArrowLeft size={16} />
            {locale === "hi" ? "सभी लेख" : "All articles"}
          </Link>
          <div className="flex items-center gap-3 text-sm text-[var(--nv-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {mins} {locale === "hi" ? "मिनट पढ़ें" : "min read"}
            </span>
            <button type="button" onClick={share} className="btn-secondary !py-2 !text-xs">
              <Share2 size={14} />
              {locale === "hi" ? "शेयर" : "Share"}
            </button>
          </div>
        </div>

        <div className="mt-10 space-y-5">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base leading-8 text-[var(--nv-text)]/90 sm:text-lg sm:leading-9 whitespace-pre-wrap"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
