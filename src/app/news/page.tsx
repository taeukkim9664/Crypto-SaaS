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
  const [activeFilter, setActiveFilter] = useState("전체");

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
    <main className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_65%)]" />

      <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-white/10 p-8">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
          <span className="h-[1px] w-8 bg-slate-600" />
          Crypto Pulse
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-100 md:text-4xl">
            뉴스
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
            RSS와 뉴스 API로 수집한 최신 크립토 헤드라인을 한 눈에.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["전체", "비트코인", "이더리움", "거시", "규제", "ETF"].map(
            (label) => (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  activeFilter === label
                    ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="h-4 w-24 rounded-full bg-white/10" />
              <div className="mt-4 h-5 w-3/4 rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_20px_50px_-30px_rgba(56,189,248,0.6)]"
            >
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                  {item.source}
                </span>
                <span>{item.published_at ?? "시간 미상"}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-100">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="transition group-hover:text-cyan-200"
                >
                  {item.title_ko || item.title}
                </a>
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                {item.summary_ko ||
                  item.summary ||
                  item.description_ko ||
                  item.description ||
                  "요약 준비 중"}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-cyan-200/70">
                <span>원문 보기</span>
                <span className="text-base leading-none">→</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
