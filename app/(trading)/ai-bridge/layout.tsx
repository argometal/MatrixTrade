export default function AiBridgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-4 w-[calc(100%+2rem)] max-w-[90rem] sm:-mx-8 sm:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
