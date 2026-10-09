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
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// Rôles (comme dans Oasis / Adie) : un nom et des droits par domaine. « admin » donne tout. Les rôles « système »
// (clé renseignée) existent d'origine ; les autres sont créés par les admins.
export const roles = mysqlTable("roles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 60 }).notNull().unique(),
  key: varchar("key", { length: 20 }).unique(), // admin | materiel | bde | member pour les rôles d'origine, sinon null
  description: varchar("description", { length: 200 }),
  isAdmin: boolean("is_admin").notNull().default(false),
  permAdministration: boolean("perm_administration").notNull().default(false), // pages d'administration (utilisateurs, rôles, réglages…)
  permMateriel: boolean("perm_materiel").notNull().default(false), // gérer l'inventaire et les prêts
  permBde: boolean("perm_bde").notNull().default(false), // publier pour le BDE (évènements, actus BDE)
  permActus: boolean("perm_actus").notNull().default(false), // publier des actus de l'école
  permGalerie: boolean("perm_galerie").notNull().default(false), // gérer la galerie
  // Niveau « Voir » de chaque domaine : accès en lecture (les étudiants voient sans gérer). Aucun = ni voir ni gérer ;
  // Gérer (perm_*) inclut toujours Voir.
  viewMateriel: boolean("view_materiel").notNull().default(true),
  viewBde: boolean("view_bde").notNull().default(true),
  viewActus: boolean("view_actus").notNull().default(true),
  viewGalerie: boolean("view_galerie").notNull().default(true),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

// Filières de l'école (Spectacle et évènementiel, Acting, Cinéma…) : gérées dans l'administration, choisies par chaque personne.
export const tracks = mysqlTable("tracks", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  // Prénom et nom sont saisis séparément ; « name » en est l'assemblage (« Prénom Nom »), utilisé pour l'affichage.
  firstName: varchar("first_name", { length: 60 }).notNull().default(""),
  lastName: varchar("last_name", { length: 60 }).notNull().default(""),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  roleId: int("role_id").references(() => roles.id),
  theme: mysqlEnum("theme", ["system", "light", "dark"]).notNull().default("dark"),
  // Skin personnel (panneau de droite) : couleur d'accent et couleur du menu.
  accent: mysqlEnum("accent", ["ambre", "bleu", "indigo", "vert", "rose", "blanc", "noir"]).notNull().default("blanc"),
  sidebar: mysqlEnum("sidebar", ["dark", "light"]).notNull().default("dark"),
  homeAddress: varchar("home_address", { length: 255 }),
  homeLat: double("home_lat"),
  homeLng: double("home_lng"),
  icalUrl: varchar("ical_url", { length: 1000 }),
  icalSyncedAt: datetime("ical_synced_at"), // dernière synchronisation réussie du planning
  icalTriedAt: datetime("ical_tried_at"), // dernière tentative (réussie ou non)
  icalError: varchar("ical_error", { length: 200 }), // motif du dernier échec (vide si tout va bien)
  // Entreprise d'alternance (facultatif) : trajets et transports autour de son adresse.
  companyName: varchar("company_name", { length: 120 }),
  companyAddress: varchar("company_address", { length: 255 }),
  companyLat: double("company_lat"),
  companyLng: double("company_lng"),
  onboarded: boolean("onboarded").notNull().default(false),
  // Dernière ouverture de la cloche : les nouveautés plus récentes comptent comme « non lues ».
  notifSeenAt: datetime("notif_seen_at"),
  // Identifiant Microsoft (« oid » Entra ID) une fois le compte lié à Office 365.
  // « active » : accès normal ; « pending » : compte Google personnel en attente de validation par un admin ;
  // « disabled » : compte désactivé par un admin (plus de connexion possible, données conservées).
  status: mysqlEnum("status", ["active", "pending", "disabled", "rejected"]).notNull().default("active"),
  rejectionNote: varchar("rejection_note", { length: 500 }), // motif du refus, affiché à la personne refusée quand elle se reconnecte
  requestNote: varchar("request_note", { length: 500 }), // message laissé par une personne en attente de validation (qui elle est, pourquoi elle demande l'accès)
  googleSub: varchar("google_sub", { length: 40 }).unique(), // identifiant Google (« sub »)
  msOid: varchar("ms_oid", { length: 80 }).unique(), // « tid.oid » : organisation + identifiant dans l'organisation
  // Fiche personnelle : annuaire de la promo et carte de visite en ligne.
  trackId: int("track_id").references(() => tracks.id, { onDelete: "set null" }), // filière
  avatarFile: varchar("avatar_file", { length: 40 }),
  headline: varchar("headline", { length: 120 }), // « Régisseur son · alternant chez… »
  phone: varchar("phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 190 }), // adresse affichée sur la carte de visite (sinon l'adresse 3IS)
  showInDirectory: boolean("show_in_directory").notNull().default(true),
  showPhone: boolean("show_phone").notNull().default(false), // téléphone visible dans l'annuaire
  cardShowPhone: boolean("card_show_phone").notNull().default(false), // téléphone visible sur la carte de visite (choix indépendant)
  showCompany: boolean("show_company").notNull().default(false), // nom de l'entreprise d'alternance visible dans l'annuaire et sur la fiche (jamais son adresse)
  discord: varchar("discord", { length: 40 }), // pseudo Discord : visible dans l'annuaire dès qu'il est renseigné
  cardShowDiscord: boolean("card_show_discord").notNull().default(false), // pseudo Discord visible sur la carte de visite (publique)
  cardShowSchool: boolean("card_show_school").notNull().default(false), // lien vers le site de l'école (3iS Bègles) sur la carte de visite
  cardSlug: varchar("card_slug", { length: 16 }).unique(), // adresse publique non devinable de la carte
  cardEnabled: boolean("card_enabled").notNull().default(false),
  feedToken: varchar("feed_token", { length: 32 }).unique(), // adresse secrète de l'abonnement calendrier (iCal)
  notifyNews: boolean("notify_news").notNull().default(true),
  notifyBde: boolean("notify_bde").notNull().default(true),
  notifyLoans: boolean("notify_loans").notNull().default(true),
  notifyReminders: boolean("notify_reminders").notNull().default(true),
  notifyMessages: boolean("notify_messages").notNull().default(true), // messages des annonces, vente validée, nouvel avis
  notifyListings: boolean("notify_listings").notNull().default(false), // nouvelle annonce publiée par la promo (désactivé par défaut : peut être bavard)
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
export type Role = typeof roles.$inferSelect;
export type Project = typeof projects.$inferSelect;

// ---------- Projets ----------

export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  eventDate: varchar("event_date", { length: 10 }), // AAAA-MM-JJ, facultatif
  // Kanban personnel : projet caché à un seul membre, créé automatiquement pour cette personne.
  personalOf: int("personal_of").unique().references(() => users.id, { onDelete: "cascade" }),
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

// Modèles de checklists proposés à la création d'une checklist de projet (gérés par les admins).
export const checklistTemplates = mysqlTable("checklist_templates", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 150 }).notNull(),
  items: text("items").notNull(), // un élément par ligne
  position: int("position").notNull().default(0),
});

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
  parentId: int("parent_id"), // page parente (sous-page), null = page de premier niveau de sa catégorie
  body: mediumtext("body").notNull(),
  createdBy: int("created_by").notNull().references(() => users.id),
  updatedBy: int("updated_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

// Images et fichiers joints aux pages du wiki (et aux articles) : le nom sur disque est aléatoire.
export const wikiFiles = mysqlTable("wiki_files", {
  id: int("id").primaryKey().autoincrement(),
  file: varchar("file", { length: 60 }).notNull().unique(),
  originalName: varchar("original_name", { length: 200 }).notNull(),
  mime: varchar("mime", { length: 60 }).notNull(),
  size: int("size").notNull(),
  uploadedBy: int("uploaded_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
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
    startDate: date("start_date", { mode: "string" }),
    dueDate: date("due_date", { mode: "string" }),
    priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).notNull().default("normal"),
    labels: varchar("labels", { length: 200 }), // étiquettes séparées par des virgules
    position: int("position").notNull().default(0),
    createdBy: int("created_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("kcard_col_idx").on(t.columnId, t.position)],
);

// Personnes assignées à une carte (une ou plusieurs).
export const kanbanCardAssignees = mysqlTable(
  "kanban_card_assignees",
  {
    cardId: int("card_id").notNull().references(() => kanbanCards.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.userId] }), index("kca_user_idx").on(t.userId)],
);

export const kanbanChecklist = mysqlTable(
  "kanban_checklist",
  {
    id: int("id").primaryKey().autoincrement(),
    cardId: int("card_id").notNull().references(() => kanbanCards.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 200 }).notNull(),
    done: boolean("done").notNull().default(false),
    position: int("position").notNull().default(0),
  },
  (t) => [index("kcl_card_idx").on(t.cardId, t.position)],
);

export const kanbanComments = mysqlTable(
  "kanban_comments",
  {
    id: int("id").primaryKey().autoincrement(),
    cardId: int("card_id").notNull().references(() => kanbanCards.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("kcm_card_idx").on(t.cardId, t.createdAt)],
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
    cardId: int("card_id").references(() => kanbanCards.id, { onDelete: "cascade" }), // pièce jointe d'une carte kanban (sinon fichier du projet)
    file: varchar("file", { length: 60 }).notNull(),
    originalName: varchar("original_name", { length: 200 }).notNull(),
    mime: varchar("mime", { length: 60 }).notNull(),
    size: int("size").notNull(),
    uploadedBy: int("uploaded_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("pf_project_idx").on(t.projectId)],
);


// ---------- Alternance : planning école / entreprise et carnet de liaison ----------

export const WORK_KINDS = ["ecole", "entreprise", "conge", "ferie"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export const workDays = mysqlTable(
  "work_days",
  {
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    kind: mysqlEnum("kind", WORK_KINDS).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const workLogs = mysqlTable(
  "work_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    minutes: int("minutes").notNull().default(0),
    place: mysqlEnum("place", ["entreprise", "ecole"]).notNull().default("entreprise"),
    mission: text("mission").notNull(),
    skills: varchar("skills", { length: 300 }), // compétences travaillées, séparées par des virgules
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("wl_user_day_idx").on(t.userId, t.day)],
);

// ---------- Bibliothèques (régie) ----------

export const fixtureModels = mysqlTable("fixture_models", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 120 }).notNull(),
  mode: varchar("mode", { length: 60 }),
  footprint: int("footprint").notNull().default(1),
  watts: int("watts"),
  notes: varchar("notes", { length: 300 }),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

export const consoleMemories = mysqlTable(
  "console_memories",
  {
    id: int("id").primaryKey().autoincrement(),
    title: varchar("title", { length: 150 }).notNull(),
    console: varchar("console", { length: 80 }), // grandMA, ETC, Chamsys…
    number: varchar("number", { length: 30 }), // numéro de mémoire, de cue, de scène
    category: varchar("category", { length: 60 }),
    notes: text("notes"),
    image: varchar("image", { length: 120 }), // nom d'un fichier envoyé (wiki_files)
    tags: varchar("tags", { length: 200 }),
    createdBy: int("created_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("cm_console_idx").on(t.console)],
);

// ---------- Planning de montage et charge électrique (par projet) ----------

export const buildSlots = mysqlTable(
  "build_slots",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM
    endTime: varchar("end_time", { length: 5 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("bs_project_idx").on(t.projectId, t.day, t.startTime)],
);

export const buildSlotAssignees = mysqlTable(
  "build_slot_assignees",
  {
    slotId: int("slot_id").notNull().references(() => buildSlots.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.userId] })],
);

export const powerCircuits = mysqlTable(
  "power_circuits",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    breakerAmps: int("breaker_amps").notNull().default(16),
    phase: int("phase").notNull().default(1), // ancien choix de phase (plus utilisé : les phases sont réparties automatiquement)
    feederAmps: int("feeder_amps"), // si renseigné : la ligne est divisée en départs de ce calibre (ex. un 63 A divisé en 32 A)
    outletAmps: int("outlet_amps").notNull().default(16), // calibre des prises de courant de la ligne (16, 32 ou 63 A)
    mode: mysqlEnum("mode", ["mono", "tetra"]).notNull().default("tetra"), // ligne monophasée ou tétraphasée (3 phases + neutre)
    position: int("position").notNull().default(0),
  },
  (t) => [index("pc_project_idx").on(t.projectId)],
);

export const powerItems = mysqlTable(
  "power_items",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    circuitId: int("circuit_id").references(() => powerCircuits.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    watts: int("watts").notNull(),
    qty: int("qty").notNull().default(1),
  },
  (t) => [index("pi_project_idx").on(t.projectId)],
);

// ---------- Covoiturage ----------

export const rides = mysqlTable(
  "rides",
  {
    id: int("id").primaryKey().autoincrement(),
    driverId: int("driver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(), // évènement ou raison du trajet
    fromPlace: varchar("from_place", { length: 200 }).notNull(),
    toPlace: varchar("to_place", { length: 200 }).notNull(),
    departsAt: datetime("departs_at").notNull(),
    seats: int("seats").notNull().default(3),
    notes: varchar("notes", { length: 300 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("ride_departs_idx").on(t.departsAt)],
);

export const ridePassengers = mysqlTable(
  "ride_passengers",
  {
    rideId: int("ride_id").notNull().references(() => rides.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.rideId, t.userId] })],
);

// ---------- Annuaire de l'école ----------

export const contacts = mysqlTable(
  "contacts",
  {
    id: int("id").primaryKey().autoincrement(),
    groupName: varchar("group_name", { length: 80 }).notNull(), // Direction, Coordination pédagogique, Magasin…
    name: varchar("name", { length: 120 }).notNull(),
    role: varchar("role", { length: 160 }),
    email: varchar("email", { length: 190 }),
    phone: varchar("phone", { length: 30 }),
    note: varchar("note", { length: 300 }),
    position: int("position").notNull().default(0),
  },
  (t) => [index("contact_group_idx").on(t.groupName, t.position)],
);

// ---------- Mot de passe oublié ----------

export const passwordResets = mysqlTable(
  "password_resets",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // sha256 du jeton envoyé par mail (jamais le jeton lui-même)
    expiresAt: datetime("expires_at").notNull(),
    usedAt: datetime("used_at"),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("pr_user_idx").on(t.userId)],
);

// ---------- Inscription en attente de confirmation par e-mail ----------

export const pendingRegistrations = mysqlTable("pending_registrations", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  firstName: varchar("first_name", { length: 60 }).notNull(),
  lastName: varchar("last_name", { length: 60 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // sha256 du jeton envoyé par mail
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

// ---------- Liens personnels (réseaux, portfolio) et carnet de réseau ----------

export const LINK_KINDS = ["linkedin", "instagram", "youtube", "vimeo", "behance", "github", "tiktok", "x", "facebook", "portfolio", "site", "autre"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const userLinks = mysqlTable(
  "user_links",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", LINK_KINDS).notNull().default("site"),
    url: varchar("url", { length: 300 }).notNull(),
    label: varchar("label", { length: 60 }),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [index("ul_user_idx").on(t.userId)],
);

// Carnet de réseau : contacts professionnels de chaque personne (visibles par elle seule).
export const networkContacts = mysqlTable(
  "network_contacts",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    jobTitle: varchar("job_title", { length: 120 }),
    company: varchar("company", { length: 120 }),
    email: varchar("email", { length: 190 }),
    phone: varchar("phone", { length: 30 }),
    linkUrl: varchar("link_url", { length: 300 }),
    notes: text("notes"),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("nc_user_idx").on(t.userId)],
);

// ---------- Petites annonces ----------

export const LISTING_CATEGORIES = ["vente", "logement", "mission", "recherche", "don", "autre"] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const listings = mysqlTable(
  "listings",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", LISTING_CATEGORIES).notNull().default("vente"),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    price: varchar("price", { length: 40 }), // texte libre : « 50 € », « 400 €/mois », « Gratuit »
    contact: varchar("contact", { length: 160 }).notNull(), // comment joindre la personne
    photoFile: varchar("photo_file", { length: 40 }),
    status: mysqlEnum("status", ["active", "closed"]).notNull().default("active"), // « closed » : vendu, pourvu…
    soldToId: int("sold_to_id").references(() => users.id, { onDelete: "set null" }), // personne à qui l'annonce a été conclue (vente, don, mission) : seule elle peut échanger des avis avec l'auteur
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
    expiresAt: datetime("expires_at").notNull(), // l'annonce disparaît d'elle-même (60 jours)
  },
  (t) => [index("listing_status_idx").on(t.status, t.createdAt), index("listing_user_idx").on(t.userId)],
);

// ---------- Sondages de disponibilités ----------

export const polls = mysqlTable(
  "polls",
  {
    id: int("id").primaryKey().autoincrement(),
    creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    closed: boolean("closed").notNull().default(false),
    finalOptionId: int("final_option_id"), // créneau retenu (renseigné à la clôture)
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("poll_creator_idx").on(t.creatorId)],
);

export const pollOptions = mysqlTable(
  "poll_options",
  {
    id: int("id").primaryKey().autoincrement(),
    pollId: int("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at"),
  },
  (t) => [index("po_poll_idx").on(t.pollId, t.startsAt)],
);

export const POLL_ANSWERS = ["yes", "maybe", "no"] as const;
export type PollAnswer = (typeof POLL_ANSWERS)[number];

export const pollVotes = mysqlTable(
  "poll_votes",
  {
    optionId: int("option_id").notNull().references(() => pollOptions.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    answer: mysqlEnum("answer", POLL_ANSWERS).notNull(),
  },
  (t) => [primaryKey({ columns: [t.optionId, t.userId] }), index("pv_user_idx").on(t.userId)],
);

// Personnes invitées à répondre (elles reçoivent une notification) ; le sondage reste ouvert à toute personne qui a le lien.
export const pollInvites = mysqlTable(
  "poll_invites",
  {
    pollId: int("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] }), index("pi_user_idx").on(t.userId)],
);

// ---------- Messagerie des annonces et avis ----------

// Une conversation par annonce et par personne intéressée (acheteur) avec l'auteur de l'annonce (vendeur).
export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").primaryKey().autoincrement(),
    listingId: int("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    buyerId: int("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: int("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    buyerReadAt: datetime("buyer_read_at"),
    sellerReadAt: datetime("seller_read_at"),
    lastMessageAt: datetime("last_message_at").notNull().$defaultFn(() => new Date()),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("conv_listing_buyer_idx").on(t.listingId, t.buyerId), index("conv_buyer_idx").on(t.buyerId), index("conv_seller_idx").on(t.sellerId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").primaryKey().autoincrement(),
    conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: int("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("msg_conv_idx").on(t.conversationId, t.createdAt)],
);

// Avis sur une personne à la suite d'une vente (ou d'un échange) : note de 1 à 5 et commentaire.
// L'annonce peut disparaître : son titre est conservé ici pour que l'avis reste lisible.
export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").primaryKey().autoincrement(),
    listingId: int("listing_id").references(() => listings.id, { onDelete: "set null" }),
    listingTitle: varchar("listing_title", { length: 120 }).notNull(),
    authorId: int("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: int("subject_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectRole: mysqlEnum("subject_role", ["seller", "buyer"]).notNull(), // rôle de la personne notée dans l'échange
    rating: int("rating").notNull(),
    comment: varchar("comment", { length: 500 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("rev_subject_idx").on(t.subjectId), index("rev_author_listing_idx").on(t.authorId, t.listingId)],
);

// Photos secondaires d'une annonce (la photo principale reste dans listings.photoFile). Les fichiers sont dans data/uploads/listings
// et servis par /api/listing-photo/<nom>, comme la photo principale.
export const listingPhotos = mysqlTable(
  "listing_photos",
  {
    id: int("id").primaryKey().autoincrement(),
    listingId: int("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    file: varchar("file", { length: 40 }).notNull(),
    position: int("position").notNull().default(0),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("lp_listing_idx").on(t.listingId, t.position)],
);

// Cours copiés depuis le lien iCalendar de l'école : ils restent consultables même si le lien tombe en panne. À chaque
// synchronisation un cours modifié est mis à jour, un cours disparu du planning est supprimé (ou marqué « retiré » s'il porte une note).
export const courses = mysqlTable(
  "courses",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    uid: varchar("uid", { length: 255 }).notNull(), // identifiant de l'évènement dans le calendrier source
    title: varchar("title", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull().default(""),
    description: text("description"),
    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    note: text("note"), // notes personnelles de l'étudiant sur ce cours
    removed: boolean("removed").notNull().default(false), // disparu du planning, gardé parce qu'il a une note
    updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("course_user_uid").on(t.userId, t.uid), index("course_user_start").on(t.userId, t.startsAt)],
);

