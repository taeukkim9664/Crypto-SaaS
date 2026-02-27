import BackButton from "../_components/BackButton";

const sections = [
  "핵심 지표",
  "트렌드",
  "실시간 업데이트",
  "커뮤니티",
  "하이라이트",
  "맞춤 알림",
];

export default function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center">
        <BackButton />
      </div>
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Section
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">적립</h1>
        <p className="text-sm text-slate-400">
          여기에 적립 페이지의 핵심 콘텐츠를 배치합니다.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200"
          >
            <h2 className="text-base font-semibold">{item}</h2>
            <p className="mt-3 text-sm text-slate-400">콘텐츠 영역</p>
          </div>
        ))}
      </section>
    </main>
  );
}
