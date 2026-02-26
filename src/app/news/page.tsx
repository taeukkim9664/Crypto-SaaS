"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  description: string | null;
  summary: string | null;
  title_ko?: string | null;
  description_ko?: string | null;
  summary_ko?: string | null;
};

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (error) {
        console.error("Failed to load news", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Section
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">뉴스</h1>
        <p className="text-sm text-slate-400">
          RSS + 무료 뉴스 API로 수집한 최신 크립토 뉴스입니다.
        </p>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-slate-300">
          뉴스 불러오는 중...
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {item.source}
                </span>
                <span>{item.published_at ?? "시간 미상"}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-100">
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title_ko || item.title}
                </a>
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {item.summary_ko ||
                  item.summary ||
                  item.description_ko ||
                  item.description ||
                  "요약 준비 중"}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
