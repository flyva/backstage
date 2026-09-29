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
  // Prénom et nom sont saisis séparément ; « name » en est l'assemblage (« Prénom Nom »), utilisé pour l'affichage.
  firstName: varchar("first_name", { length: 60 }).notNull().default(""),
  lastName: varchar("last_name", { length: 60 }).notNull().default(""),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "materiel", "bde", "member"]).notNull().default("member"),
  theme: mysqlEnum("theme", ["system", "light", "dark"]).notNull().default("light"),
  // Skin personnel (panneau de droite) : couleur d'accent et couleur du menu.
  accent: mysqlEnum("accent", ["ambre", "bleu", "indigo", "vert", "rose"]).notNull().default("ambre"),
  sidebar: mysqlEnum("sidebar", ["dark", "light"]).notNull().default("dark"),
  homeAddress: varchar("home_address", { length: 255 }),
  homeLat: double("home_lat"),
  homeLng: double("home_lng"),
  icalUrl: varchar("ical_url", { length: 1000 }),
  // Entreprise d'alternance (facultatif) : trajets et transports autour de son adresse.
  companyName: varchar("company_name", { length: 120 }),
  companyAddress: varchar("company_address", { length: 255 }),
  companyLat: double("company_lat"),
  companyLng: double("company_lng"),
  onboarded: boolean("onboarded").notNull().default(false),
  // Dernière ouverture de la cloche : les nouveautés plus récentes comptent comme « non lues ».
  notifSeenAt: datetime("notif_seen_at"),
  // Identifiant Microsoft (« oid » Entra ID) une fois le compte lié à Office 365.
  // « active » : accès normal ; « pending » : compte Google personnel en attente de validation par un admin.
  status: mysqlEnum("status", ["active", "pending"]).notNull().default("active"),
  googleSub: varchar("google_sub", { length: 40 }).unique(), // identifiant Google (« sub »)
  msOid: varchar("ms_oid", { length: 80 }).unique(), // « tid.oid » : organisation + identifiant dans l'organisation
  notifyNews: boolean("notify_news").notNull().default(true),
  notifyBde: boolean("notify_bde").notNull().default(true),
  notifyLoans: boolean("notify_loans").notNull().default(true),
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

// ---------- Kanban (par projet) ----------

export const kanbanColumns = mysqlTable(
  "kanban_columns",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 80 }).notNull(),
    position: int("position").notNull().default(0),
  },
  (t) => [index("kc_project_idx").on(t.projectId, t.position)],
);

export const kanbanCards = mysqlTable(
  "kanban_cards",
  {
    id: int("id").primaryKey().autoincrement(),
    columnId: int("column_id").notNull().references(() => kanbanColumns.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    assigneeId: int("assignee_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date", { mode: "string" }),
    position: int("position").notNull().default(0),
    createdBy: int("created_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("kcard_col_idx").on(t.columnId, t.position)],
);

// ---------- Actualités ----------

export const newsPosts = mysqlTable(
  "news_posts",
  {
    id: int("id").primaryKey().autoincrement(),
    title: varchar("title", { length: 200 }).notNull(),
    body: mediumtext("body").notNull(),
    scope: mysqlEnum("scope", ["ecole", "bde"]).notNull().default("ecole"),
    pinned: boolean("pinned").notNull().default(false),
    authorId: int("author_id").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("news_created_idx").on(t.pinned, t.createdAt)],
);

// ---------- BDE ----------

export const bdeEvents = mysqlTable(
  "bde_events",
  {
    id: int("id").primaryKey().autoincrement(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    startsAt: datetime("starts_at").notNull(),
    location: varchar("location", { length: 200 }),
    capacity: int("capacity"), // null = illimité
    createdBy: int("created_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("bde_ev_start_idx").on(t.startsAt)],
);

export const bdeRegistrations = mysqlTable(
  "bde_registrations",
  {
    eventId: int("event_id").notNull().references(() => bdeEvents.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

export const bdePolls = mysqlTable("bde_polls", {
  id: int("id").primaryKey().autoincrement(),
  question: varchar("question", { length: 255 }).notNull(),
  closesAt: datetime("closes_at"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const bdePollOptions = mysqlTable(
  "bde_poll_options",
  {
    id: int("id").primaryKey().autoincrement(),
    pollId: int("poll_id").notNull().references(() => bdePolls.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 150 }).notNull(),
    position: int("position").notNull().default(0),
  },
  (t) => [index("bde_opt_poll_idx").on(t.pollId)],
);

export const bdePollVotes = mysqlTable(
  "bde_poll_votes",
  {
    pollId: int("poll_id").notNull().references(() => bdePolls.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    optionId: int("option_id").notNull().references(() => bdePollOptions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })],
);

export const IDEA_STATUSES = ["new", "planned", "done", "rejected"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const bdeIdeas = mysqlTable("bde_ideas", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: varchar("body", { length: 1000 }).notNull(),
  status: mysqlEnum("status", IDEA_STATUSES).notNull().default("new"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const bdeIdeaVotes = mysqlTable(
  "bde_idea_votes",
  {
    ideaId: int("idea_id").notNull().references(() => bdeIdeas.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

// ---------- Galerie ----------

export const galleryAlbums = mysqlTable("gallery_albums", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 150 }).notNull(),
  description: varchar("description", { length: 500 }),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const galleryItems = mysqlTable(
  "gallery_items",
  {
    id: int("id").primaryKey().autoincrement(),
    albumId: int("album_id").notNull().references(() => galleryAlbums.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["image", "video"]).notNull(),
    file: varchar("file", { length: 60 }).notNull(),
    thumb: varchar("thumb", { length: 60 }),
    caption: varchar("caption", { length: 300 }),
    uploaderId: int("uploader_id").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("gi_album_idx").on(t.albumId, t.createdAt)],
);

// ---------- Notifications push ----------

export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: varchar("endpoint", { length: 600 }).notNull().unique(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    auth: varchar("auth", { length: 100 }).notNull(),
    userAgent: varchar("user_agent", { length: 200 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("ps_user_idx").on(t.userId)],
);

// ---------- Fiches techniques (par projet) ----------

export const techLights = mysqlTable(
  "tech_lights",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    channel: int("channel"), // numéro de circuit / canal console
    label: varchar("label", { length: 120 }).notNull(),
    mode: varchar("mode", { length: 60 }),
    universe: int("universe").notNull().default(1),
    address: int("address"), // 1..512, null = pas encore patché
    footprint: int("footprint").notNull().default(1), // nombre de canaux DMX occupés
    position: varchar("position", { length: 100 }),
    color: varchar("color", { length: 60 }),
    notes: varchar("notes", { length: 300 }),
  },
  (t) => [index("tl_project_idx").on(t.projectId, t.universe, t.address)],
);

export const techInputs = mysqlTable(
  "tech_inputs",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    channel: int("channel").notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    mic: varchar("mic", { length: 100 }),
    stand: varchar("stand", { length: 60 }),
    phantom: boolean("phantom").notNull().default(false),
    notes: varchar("notes", { length: 300 }),
  },
  (t) => [index("ti_project_idx").on(t.projectId, t.channel)],
);

export const projectFiles = mysqlTable(
  "project_files",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    file: varchar("file", { length: 60 }).notNull(),
    originalName: varchar("original_name", { length: 200 }).notNull(),
    mime: varchar("mime", { length: 60 }).notNull(),
    size: int("size").notNull(),
    uploadedBy: int("uploaded_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("pf_project_idx").on(t.projectId)],
);

