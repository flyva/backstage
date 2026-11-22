export default async function AlternanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold print:hidden">Alternance</h1>
      {children}
    </div>
  );
}
