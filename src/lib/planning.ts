// Planning de montage : détection des chevauchements par personne (partagé serveur / client).
export type Slot = { id: number; day: string; startTime: string; endTime: string; title: string; assigneeIds: number[] };

/** Renvoie, pour chaque créneau, les identifiants des personnes prises sur deux créneaux qui se chevauchent le même jour. */
export function slotConflicts(slots: Slot[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const add = (slotId: number, userId: number) => out.set(slotId, [...new Set([...(out.get(slotId) ?? []), userId])]);
  const byDay = Map.groupBy(slots, (s) => s.day);
  for (const list of byDay.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.startTime < b.endTime && b.startTime < a.endTime) {
          for (const u of a.assigneeIds.filter((x) => b.assigneeIds.includes(x))) { add(a.id, u); add(b.id, u); }
        }
      }
    }
  }
  return out;
}
