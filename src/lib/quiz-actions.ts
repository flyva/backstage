"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const questionSchema = z.object({
  courseKey: z.string().trim().min(1).max(40),
  question: z.string().trim().min(5, "Question requise (5 caractères minimum)").max(500),
  choiceA: z.string().trim().min(1, "Les 4 réponses sont requises").max(300),
  choiceB: z.string().trim().min(1, "Les 4 réponses sont requises").max(300),
  choiceC: z.string().trim().min(1, "Les 4 réponses sont requises").max(300),
  choiceD: z.string().trim().min(1, "Les 4 réponses sont requises").max(300),
  answer: z.coerce.number().int().min(0).max(3),
});
const refresh = (courseKey: string) => {
  revalidatePath("/admin/quiz");
  revalidatePath(`/quiz/${courseKey}`);
};

export async function saveQuestion(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = questionSchema.safeParse({
    courseKey: fd.get("courseKey"), question: fd.get("question"),
    choiceA: fd.get("choiceA"), choiceB: fd.get("choiceB"), choiceC: fd.get("choiceC"), choiceD: fd.get("choiceD"),
    answer: fd.get("answer"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { courseKey, ...values } = p.data;
  const raw = fd.get("id");
  if (raw) {
    await db.update(quizQuestions).set({ courseKey, ...values }).where(eq(quizQuestions.id, id.parse(raw)));
  } else {
    await db.insert(quizQuestions).values({ courseKey, ...values, createdBy: admin.id });
  }
  refresh(courseKey);
  return { ok: raw ? "Question enregistrée" : "Question ajoutée" };
}

export async function deleteQuestion(fd: FormData) {
  await requireAdmin();
  const qid = id.parse(fd.get("id"));
  const [row] = await db.select({ courseKey: quizQuestions.courseKey }).from(quizQuestions).where(eq(quizQuestions.id, qid)).limit(1);
  await db.delete(quizQuestions).where(eq(quizQuestions.id, qid));
  if (row) refresh(row.courseKey);
}

/** Toutes les questions d'un cours, pour que le quiz en tire un tirage au hasard côté client. */
export async function loadQuizBank(courseKey: string) {
  await requireUser();
  return db.select().from(quizQuestions).where(eq(quizQuestions.courseKey, courseKey));
}
