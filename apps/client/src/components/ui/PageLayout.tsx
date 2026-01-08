import type { ReactNode } from "react";

interface PageLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ header, footer, children }: PageLayoutProps) {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] grid-cols-1 gap-8 h-full">
      {header && <header className="mt-4">{header}</header>}
      <main>{children}</main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}
