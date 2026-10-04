"use client";

import { useActionState } from "react";
import { createCourse } from "@/lib/course-actions";

// Ajout d'un cours ou d'une note hors planning de l'école (cours non prévu, rattrapage, conférence, révision…).
export function CourseCreateForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="title">Titre</label>
        <input id="title" name="title" required maxLength={255} className="input" placeholder="Régie son : cours supplémentaire" autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="day">Date</label>
          <input id="day" name="day" type="date" required defaultValue={today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="start">Début</label>
          <input id="start" name="start" type="time" required defaultValue="09:00" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="end">Fin</label>
          <input id="end" name="end" type="time" required defaultValue="12:00" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="location">Lieu (facultatif)</label>
        <input id="location" name="location" maxLength={255} className="input" placeholder="Salle, adresse…" />
      </div>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer et écrire mes notes"}</button>
    </form>
  );
}
