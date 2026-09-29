import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  datetime,
  double,
  mysqlEnum,
  index,
  primaryKey,
  date,
  mediumtext,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "materiel", "bde", "member"]).notNull().default("member"),
  theme: mysqlEnum("theme", ["system", "light", "dark"]).notNull().default("system"),
  homeAddress: varchar("home_address", { length: 255 }),
  homeLat: double("home_lat"),
  homeLng: double("home_lng"),
  icalUrl: varchar("ical_url", { length: 1000 }),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(), // sha256 du jeton
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const faqItems = mysqlTable("faq_items", {
  id: int("id").primaryKey().autoincrement(),
  category: varchar("category", { length: 80 }).notNull().default("Général"),
  question: varchar("question", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  position: int("position").notNull().default(0),
});

export const usefulLinks = mysqlTable("useful_links", {
  id: int("id").primaryKey().autoincrement(),
  category: varchar("category", { length: 80 }).notNull().default("École"),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  description: varchar("description", { length: 255 }),
  position: int("position").notNull().default(0),
});

// Paramètres globaux clé/valeur (wifi, plan, webmail, …)
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;

// ---------- Projets ----------

export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  eventDate: varchar("event_date", { length: 10 }), // AAAA-MM-JJ, facultatif
  createdBy: int("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const projectMembers = mysqlTable(
  "project_members",
  {
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "editor", "viewer"]).notNull().default("editor"),
    addedAt: datetime("added_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index("pm_user_idx").on(t.userId)],
);

export const checklists = mysqlTable(
  "checklists",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    position: int("position").notNull().default(0),
  },
  (t) => [index("cl_project_idx").on(t.projectId)],
);

export const checklistItems = mysqlTable(
  "checklist_items",
  {
    id: int("id").primaryKey().autoincrement(),
    checklistId: int("checklist_id")
      .notNull()
      .references(() => checklists.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    done: boolean("done").notNull().default(false),
    position: int("position").notNull().default(0),
  },
  (t) => [index("ci_checklist_idx").on(t.checklistId)],
);

export type ProjectRole = "owner" | "editor" | "viewer";

// ---------- Conduite de spectacle ----------

export const CUE_CATEGORIES = ["lumiere", "son", "video", "plateau", "regie", "autre"] as const;
export type CueCategory = (typeof CUE_CATEGORIES)[number];

export const cues = mysqlTable(
  "cues",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    position: int("position").notNull().default(0),
    number: varchar("number", { length: 20 }), // numéro affiché (ex. « 12.5 »), sinon l'ordre
    title: varchar("title", { length: 200 }).notNull(),
    category: mysqlEnum("category", CUE_CATEGORIES).notNull().default("lumiere"),
    durationSec: int("duration_sec"),
    notes: text("notes"),
  },
  (t) => [index("cue_project_idx").on(t.projectId, t.position)],
);

// ---------- Prêt de matériel (école) ----------

export const equipmentItems = mysqlTable("equipment_items", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 150 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Divers"),
  code: varchar("code", { length: 40 }), // repère d'inventaire, ex. LUM-014
  description: text("description"),
  location: varchar("location", { length: 120 }),
  quantity: int("quantity").notNull().default(1),
  status: mysqlEnum("status", ["active", "maintenance", "retired"]).notNull().default("active"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const LOAN_STATUSES = ["requested", "reserved", "out", "returned", "rejected", "cancelled"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const loans = mysqlTable(
  "loans",
  {
    id: int("id").primaryKey().autoincrement(),
    itemId: int("item_id")
      .notNull()
      .references(() => equipmentItems.id),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    quantity: int("quantity").notNull().default(1),
    status: mysqlEnum("status", LOAN_STATUSES).notNull().default("requested"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(), // deadline de retour
    note: varchar("note", { length: 500 }), // motif / projet
    conditionOut: varchar("condition_out", { length: 500 }),
    conditionIn: varchar("condition_in", { length: 500 }),
    requestedAt: datetime("requested_at").notNull().$defaultFn(() => new Date()),
    outAt: datetime("out_at"),
    returnedAt: datetime("returned_at"),
  },
  (t) => [index("loan_item_idx").on(t.itemId, t.status), index("loan_user_idx").on(t.userId)],
);

// ---------- Wiki ----------

export const wikiPages = mysqlTable("wiki_pages", {
  id: int("id").primaryKey().autoincrement(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Général"),
  body: mediumtext("body").notNull(),
  createdBy: int("created_by").notNull().references(() => users.id),
  updatedBy: int("updated_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

// Chaque enregistrement crée une révision : un vandalisme se répare en un clic.
export const wikiRevisions = mysqlTable(
  "wiki_revisions",
  {
    id: int("id").primaryKey().autoincrement(),
    pageId: int("page_id").notNull().references(() => wikiPages.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: mediumtext("body").notNull(),
    editorId: int("editor_id").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("wr_page_idx").on(t.pageId, t.createdAt)],
);
