export function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-4xl font-bold text-cyan-50 tracking-wide uppercase">
      {children}
    </h1>
  );
}
