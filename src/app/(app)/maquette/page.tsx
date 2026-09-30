import { requireUser } from "@/lib/auth";
import { MenuMockup } from "@/components/MenuMockup";

export const metadata = { title: "Maquette du menu" };

export default async function MockupPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Maquette : menu horizontal ou vertical</h1>
        <p className="text-sm text-muted">Essaie les deux pour l&apos;Administration et le Profil, avec les couleurs et le thème de ton compte.</p>
      </header>
      <MenuMockup />
    </div>
  );
}
