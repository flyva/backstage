import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Globe } from "lucide-react";
import { db } from "@/db";
import { altCompanies, altCompanySearches, companyContacts, companyInterviews, companyStatuses } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { KIND_LABEL, PRIORITY_LABEL } from "@/lib/company-search";
import { STATUS_BADGE_CLASS } from "@/lib/company-status";
import { TypeBadges } from "@/components/TypeBadges";
import { ContactHistory, InterviewList, SearchFieldsForm } from "@/components/company-detail-forms";

export const metadata = { title: "Suivi entreprise" };

export default async function CompanySearchDetailPage({ params }: PageProps<"/recherche-entreprises/suivi/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [search] = await db.select().from(altCompanySearches).where(and(eq(altCompanySearches.id, id), eq(altCompanySearches.userId, user.id))).limit(1);
  if (!search) notFound();
  const [company] = await db.select().from(altCompanies).where(eq(altCompanies.id, search.companyId)).limit(1);
  if (!company) notFound();

  const [statuses, contacts, interviews] = await Promise.all([
    db.select().from(companyStatuses).orderBy(asc(companyStatuses.position)),
    db.select().from(companyContacts).where(eq(companyContacts.searchId, id)).orderBy(asc(companyContacts.contactDate)),
    db.select().from(companyInterviews).where(eq(companyInterviews.searchId, id)).orderBy(asc(companyInterviews.interviewDate)),
  ]);
  const statusDef = search.status ? statuses.find((s) => s.key === search.status) : undefined;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm"><Link href="/recherche-entreprises" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Mon tableau</Link></p>
      <header>
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p className="text-sm text-muted">{company.city}{company.sector ? ` · ${company.sector}` : ""}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <TypeBadges types={company.types} />
          {statusDef && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_BADGE_CLASS[statusDef.color]}`}>{statusDef.label}</span>}
          {search.kind && <span className="text-xs text-muted">{KIND_LABEL[search.kind]}</span>}
          {search.priority && <span className="text-xs text-muted">Priorité {PRIORITY_LABEL[search.priority].toLowerCase()}</span>}
        </div>
        {!company.published && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Globe size={12} /> Pas encore publiée dans l&apos;annuaire</p>}
      </header>

      {(company.contactName || company.phone || company.email || company.address) && (
        <div className="card space-y-1 text-sm">
          <h2 className="font-semibold">Coordonnées</h2>
          {company.contactName && <p>{company.contactTitle ? `${company.contactTitle} — ` : ""}{company.contactName}</p>}
          {company.phone && <p className="text-muted">{company.phone}</p>}
          {company.email && <p className="text-muted">{company.email}</p>}
          {company.address && <p className="text-muted">{company.address}</p>}
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold">Suivi</h2>
        <SearchFieldsForm searchId={search.id} status={search.status} priority={search.priority} kind={search.kind}
          lastContactDate={search.lastContactDate} delayDays={search.delayDays} note={search.note} statuses={statuses} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Entretiens</h2>
        <InterviewList searchId={search.id} interviews={interviews} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Historique de contact</h2>
        <p className="text-xs text-muted">Base d&apos;appel : chaque contact (appel, mail, visite) avec un commentaire.</p>
        <ContactHistory searchId={search.id} contacts={contacts} />
      </div>
    </div>
  );
}
