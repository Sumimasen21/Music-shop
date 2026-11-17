export default function Loading() {
  return (
    <div className="container-shell animate-pulse py-20" role="status">
      <div className="mb-6 h-10 w-64 rounded bg-[#161619]" />
      <div className="h-72 rounded-xl border border-[#D4AF37]/20 bg-[#161619]" />
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
