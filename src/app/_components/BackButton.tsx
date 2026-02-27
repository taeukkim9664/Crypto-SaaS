"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  className?: string;
};

export default function BackButton({
  label = "뒤로가기",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white ${className}`}
    >
      <span className="text-base leading-none">←</span>
      {label}
    </button>
  );
}
