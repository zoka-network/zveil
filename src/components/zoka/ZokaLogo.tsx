export function ZokaLogo({ className }: { className?: string }) {
  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 10h14L9 22h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
      </svg>
      <span className="mono text-[15px] font-semibold tracking-[0.18em]">ZVEIL</span>
    </div>
  );
}
