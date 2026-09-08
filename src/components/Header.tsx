interface HeaderProps {
  actions?: React.ReactNode;
}

export default function Header({ actions }: HeaderProps) {
  return (
    <header className="w-full border-b border-ink/10">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-5">
        <svg
          width="56"
          height="56"
          viewBox="0 0 100 100"
          className="h-14 w-14 shrink-0"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="42" fill="#FBF6EC" stroke="#1A2420" strokeWidth="4" />
          <line x1="50" y1="9" x2="50" y2="17" stroke="#1A2420" strokeWidth="3" strokeLinecap="round" />
          <line x1="91" y1="50" x2="83" y2="50" stroke="#1A2420" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="91" x2="50" y2="83" stroke="#1A2420" strokeWidth="3" strokeLinecap="round" />
          <line x1="9" y1="50" x2="17" y2="50" stroke="#1A2420" strokeWidth="3" strokeLinecap="round" />
          <polygon points="50,28 64,56 36,56" fill="#E8654A" stroke="#1A2420" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="40" cy="64" r="3.6" fill="#1A2420" />
          <circle cx="60" cy="64" r="3.6" fill="#1A2420" />
          <path d="M38 74 Q50 83 62 74" fill="none" stroke="#1A2420" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
        <div>
          <p className="font-heading text-xl leading-tight text-ink">smile compass</p>
          <p className="text-sm text-ink/70">住まい探しに、笑顔のコンパスを。</p>
          <p className="text-xs text-ink/55">4人の専門家によるセルフ診断記録</p>
        </div>
        {actions && <div className="ml-auto shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
