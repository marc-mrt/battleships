import { GameHome } from "./components/game";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid items-center h-dvh w-full bg-linear-to-br from-slate-900 to-slate-950 text-cyan-50 transition-all duration-600 ease-in-out">
      <div className="fixed inset-0 bg-(image:--color-gradient-scanline) pointer-events-none z-1 transition-all duration-600 ease-in-out" />
      <div className="relative z-2 bg-slate-900 border border-slate-700 mx-auto rounded-lg px-8 w-11/12 md:w-1/2 2xl:w-2/6 h-11/12 lg:h-4/6">
        {children}
      </div>
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <GameHome />
    </Layout>
  );
}
