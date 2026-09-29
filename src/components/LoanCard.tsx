import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { LoanStatus } from "@/db/schema";
import { cancelLoan, decideLoan, markOut, markReturned } from "@/lib/equipment-actions";
import { daysBetween, isOverdue, STATUS_LABEL, todayParis } from "@/lib/equipment";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });
const fmt = (iso: string) => dateFmt.format(new Date(iso));

export type LoanView = {
  id: number;
  status: LoanStatus;
  quantity: number;
  startDate: string;
  dueDate: string;
  note: string | null;
  conditionOut: string | null;
  conditionIn: string | null;
  itemId: number;
  itemName: string;
  borrower?: string; // renseigné pour les référents
};

const STATUS_STYLE: Record<LoanStatus, string> = {
  requested: "border-line text-muted",
  reserved: "border-accent text-accent",
  out: "border-accent bg-accent text-accent-fg",
  returned: "border-line text-muted",
  rejected: "border-line text-muted line-through",
  cancelled: "border-line text-muted line-through",
};

export function LoanCard({ loan, manager = false, mine = false }: { loan: LoanView; manager?: boolean; mine?: boolean }) {
  const today = todayParis();
  const overdue = isOverdue(loan, today);
  const left = daysBetween(today, loan.dueDate);

  return (
    <li className={`card space-y-2 p-3 ${overdue ? "border-danger" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/materiel/${loan.itemId}`} className="font-medium hover:text-accent">
          {loan.quantity > 1 && `${loan.quantity} × `}{loan.itemName}
        </Link>
        <span className={`rounded-md border px-1.5 py-0.5 text-xs ${STATUS_STYLE[loan.status]}`}>{STATUS_LABEL[loan.status]}</span>
        {overdue && (
          <span className="flex items-center gap-1 text-xs font-medium text-danger">
            <AlertTriangle size={12} /> En retard de {-left} j
          </span>
        )}
        {loan.status === "out" && !overdue && left <= 2 && (
          <span className="text-xs text-accent">{left === 0 ? "À rendre aujourd'hui" : `À rendre dans ${left} j`}</span>
        )}
      </div>
      <div className="text-xs text-muted">
        {loan.borrower && <>{loan.borrower} · </>}
        du {fmt(loan.startDate)} au <strong className="text-fg">{fmt(loan.dueDate)}</strong>
        {loan.note && <> · {loan.note}</>}
      </div>
      {loan.conditionOut && <div className="text-xs text-muted">État à la sortie : {loan.conditionOut}</div>}
      {loan.conditionIn && <div className="text-xs text-muted">État au retour : {loan.conditionIn}</div>}

      {mine && ["requested", "reserved"].includes(loan.status) && (
        <form action={cancelLoan}>
          <input type="hidden" name="loanId" value={loan.id} />
          <button className="btn-ghost text-xs">Annuler ma demande</button>
        </form>
      )}

      {manager && loan.status === "requested" && (
        <form action={decideLoan} className="flex gap-2">
          <input type="hidden" name="loanId" value={loan.id} />
          <button name="decision" value="approve" className="btn text-xs">Valider</button>
          <button name="decision" value="reject" className="btn-ghost text-xs">Refuser</button>
        </form>
      )}
      {manager && ["requested", "reserved"].includes(loan.status) && (
        <form action={markOut} className="flex flex-wrap gap-2">
          <input type="hidden" name="loanId" value={loan.id} />
          <input name="condition" placeholder="État à la sortie (facultatif)" maxLength={500} className="input min-w-48 flex-1 text-xs" />
          <button className="btn-ghost text-xs">Marquer sorti</button>
        </form>
      )}
      {manager && loan.status === "out" && (
        <form action={markReturned} className="flex flex-wrap gap-2">
          <input type="hidden" name="loanId" value={loan.id} />
          <input name="condition" placeholder="État au retour (facultatif)" maxLength={500} className="input min-w-48 flex-1 text-xs" />
          <button className="btn text-xs">Marquer rendu</button>
        </form>
      )}
    </li>
  );
}
