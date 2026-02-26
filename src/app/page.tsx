import Link from "next/link";

const primaryMenu = [
  { label: "오늘", href: "/today" },
  { label: "뉴스", href: "/news" },
  { label: "시장", href: "/market" },
  { label: "Alpha", href: "/alpha" },
  { label: "현재 인기 주제", href: "/trending-topics" },
  { label: "기능", href: "/features" },
  { label: "적립", href: "/rewards" },
  { label: "계정", href: "/account" },
];

const utilityMenu = [
  { label: "언어", href: "/language" },
  { label: "앱 다운로드", href: "/app-download" },
  { label: "로그인", href: "/login" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 via-rose-400 to-fuchsia-500 shadow-lg shadow-rose-500/20" />
            <span className="text-lg font-semibold tracking-wide">
              CryptoSaaS
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-200 lg:flex">
            {primaryMenu.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="cursor-pointer transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 text-sm text-slate-300 lg:flex">
            {utilityMenu.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="cursor-pointer rounded-full border border-white/10 px-3 py-1 transition-colors hover:border-white/30 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5 lg:hidden">
          <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-6 py-3 text-sm text-slate-300">
            {primaryMenu.concat(utilityMenu).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-white/10 px-3 py-1"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16">
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-slate-300">
          콘텐츠 영역
        </div>
      </main>
    </div>
  );
}
