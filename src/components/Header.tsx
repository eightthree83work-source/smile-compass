export default function Header() {
  return (
    <header className="w-full border-b border-ink/10">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent">
          <span className="font-heading text-lg leading-none text-accent">物</span>
        </div>
        <div>
          <p className="font-heading text-xl leading-tight text-ink">物件カルテ</p>
          <p className="text-xs text-ink/55">4人の専門家によるセルフ診断記録</p>
        </div>
      </div>
    </header>
  );
}
