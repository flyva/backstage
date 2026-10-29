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
  type AnyMySqlColumn,
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
  permTickets: boolean("perm_tickets").notNull().default(false), // voir et gérer tous les tickets (pas besoin d'être admin)
  // Niveau « Voir » de chaque domaine : accès en lecture (les étudiants voient sans gérer). Aucun = ni voir ni gérer ;
  // Gérer (perm_*) inclut toujours Voir.
  viewMateriel: boolean("view_materiel").notNull().default(true),
  viewBde: boolean("view_bde").notNull().default(true),
  viewActus: boolean("view_actus").notNull().default(true),
  viewGalerie: boolean("view_galerie").notNull().default(true),
  // Sections entières du menu (pas de niveau « Gérer », juste visible ou pas) : utile pour un rôle externe réduit à l'essentiel.
  viewSavoirs: boolean("view_savoirs").notNull().default(true),
  viewPromo: boolean("view_promo").notNull().default(true),
  viewVie: boolean("view_vie").notNull().default(true),
  viewDetente: boolean("view_detente").notNull().default(true),
  viewRechercheEntreprises: boolean("view_recherche_entreprises").notNull().default(true),
  // Pages du sous-menu « Cours » visibles pour ce rôle : liste de clés séparées par des virgules (ex. "cours,habilitation").
  // Vide ou absent = toutes visibles (pas besoin de migration pour chaque nouvelle page ajoutée plus tard).
  courseTags: text("course_tags"),
  // Pages individuelles masquées du menu pour ce rôle (ex. "/alternance/pointeuse,/instagram") : liste de hrefs
  // séparés par des virgules. Vide ou absent = rien de masqué. Même principe d'opt-out que courseTags.
  hiddenPages: text("hidden_pages"),
  // Rôle externe en lecture seule (entreprise d'accueil, tuteur sans accès au reste de l'appli) : quel que soit le
  // reste des réglages ci-dessus, l'accès se limite à l'agenda, au planning/pointeuse des personnes qui l'ont
  // désigné comme référent (agendaViewers) et aux contacts de l'école ; aucune page de gestion n'est accessible.
  isCompany: boolean("is_company").notNull().default(false),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

// Filières de l'école (Spectacle et évènementiel, Acting, Cinéma…) : gérées dans l'administration, choisies par chaque personne.
export const tracks = mysqlTable("tracks", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  sortOrder: int("sort_order").notNull().default(0),
});

// Classes de promo (ex. "Promo 2026 A") : même principe que les filières, mais regroupement par classe plutôt que par spécialité.
export const classes = mysqlTable("classes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  sortOrder: int("sort_order").notNull().default(0),
});

// Statistiques de fréquentation (admin) : un compteur par page × type d'appareil, pas une ligne par visite (reste léger sur le Pi).
export const pageStats = mysqlTable("page_stats", {
  id: int("id").primaryKey().autoincrement(),
  path: varchar("path", { length: 255 }).notNull(),
  device: mysqlEnum("device", ["mobile", "desktop"]).notNull(),
  visits: int("visits").notNull().default(0),
  lastVisitAt: datetime("last_visit_at").notNull().$defaultFn(() => new Date()),
}, (t) => [uniqueIndex("page_stats_path_device_idx").on(t.path, t.device)]);

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
  // Skin personnel (panneau de droite) : couleur d'accent, couleur du menu, teinte de fond.
  accent: mysqlEnum("accent", ["ambre", "bleu", "indigo", "vert", "rose", "blanc", "noir"]).notNull().default("blanc"),
  sidebar: mysqlEnum("sidebar", ["dark", "light"]).notNull().default("dark"),
  background: mysqlEnum("background", ["defaut", "chaud", "froid", "vert"]).notNull().default("defaut"),
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
  // Dernière requête vue de cette personne (mise à jour au plus une fois toutes les 10 min) : sert aux statistiques d'utilisation en admin.
  lastSeenAt: datetime("last_seen_at"),
  // Identifiant Microsoft (« oid » Entra ID) une fois le compte lié à Office 365.
  // « active » : accès normal ; « pending » : compte Google personnel en attente de validation par un admin ;
  // « disabled » : compte désactivé par un admin (plus de connexion possible, données conservées).
  status: mysqlEnum("status", ["active", "pending", "disabled", "rejected"]).notNull().default("active"),
  // Date d'acceptation des CGU/mentions légales/politique de confidentialité. Absent = pas encore accepté : l'accès
  // est bloqué (page /accepter-cgu) jusqu'au clic. Republier un texte légal n'efface pas cette date (pas de
  // réacceptation forcée pour l'instant) : voir la page RGPD en admin si ça doit changer.
  cguAcceptedAt: datetime("cgu_accepted_at"),
  rejectionNote: varchar("rejection_note", { length: 500 }), // motif du refus, affiché à la personne refusée quand elle se reconnecte
  requestNote: varchar("request_note", { length: 500 }), // message laissé par une personne en attente de validation (qui elle est, pourquoi elle demande l'accès)
  googleSub: varchar("google_sub", { length: 40 }).unique(), // identifiant Google (« sub »)
  msOid: varchar("ms_oid", { length: 80 }).unique(), // « tid.oid » : organisation + identifiant dans l'organisation
  // Fiche personnelle : annuaire de la promo et carte de visite en ligne.
  trackId: int("track_id").references(() => tracks.id, { onDelete: "set null" }), // filière
  classId: int("class_id").references(() => classes.id, { onDelete: "set null" }), // classe de promo
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
  habilitation: varchar("habilitation", { length: 12 }), // symbole d'habilitation électrique (B0, BS, B1V…) : visible dans l'annuaire dès qu'il est renseigné
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
  notifyUpdates: boolean("notify_updates").notNull().default(true), // nouveauté marquée importante
  notifyEmptyPointeuse: boolean("notify_empty_pointeuse").notNull().default(false), // facultatif : rappel si rien pointé un jour travaillé (voir cron reminders)
  // Pointeuse : durée d'une journée standard (par défaut 7 h) et nombre de jours travaillés par semaine (par défaut 5).
  // Les heures sup se comptent sur la semaine (effectif au-delà de standardWorkMinutes × workDaysPerWeek) ; les derniers
  // jours de la semaine au-delà de workDaysPerWeek sont marqués « repos » automatiquement s'il n'y a rien dessus.
  standardWorkMinutes: int("standard_work_minutes").notNull().default(420),
  workDaysPerWeek: int("work_days_per_week").notNull().default(5),
  // Restauration (notes de frais) : plafonds de remboursement propres à CHAQUE personne (contrat différent selon l'entreprise),
  // jamais un réglage général. Null = non configuré, pas de calcul affiché. Le montant du ticket-restaurant (part patronale,
  // facultatif) est déduit du remboursement sur le(s) repas concerné(s) (resto_tr_moment) ; "journee_entiere" le déduit une
  // seule fois sur le total du jour (midi/soir/matin), sans jamais toucher la catégorie "autre". "Autre" a sa propre
  // déduction facultative (resto_autre_cents), indépendante du ticket-restaurant.
  restoMaxDayCents: int("resto_max_day_cents"),
  restoMaxMealCents: int("resto_max_meal_cents"),
  restoTrCents: int("resto_tr_cents"),
  restoTrMoment: mysqlEnum("resto_tr_moment", ["midi", "soir", "matin", "les_deux", "journee_entiere"]).notNull().default("midi"),
  restoAutreCents: int("resto_autre_cents"),
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

// Qui peut voir en lecture seule le planning/pointeuse/stats de qui (agenda partagé avec un tuteur, l'entreprise
// d'accueil…) : une personne peut avoir plusieurs référents, et un référent peut suivre plusieurs personnes.
export const agendaViewers = mysqlTable(
  "agenda_viewers",
  {
    ownerUserId: int("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    viewerUserId: int("viewer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.ownerUserId, t.viewerUserId] }), index("agenda_viewers_viewer_idx").on(t.viewerUserId)],
);

// Qui, côté admin, a consulté ou modifié la fiche de qui (RGPD : traçabilité des accès aux données sensibles).
// targetUserId en SET NULL : le journal garde la trace même si le compte visé est supprimé plus tard (le nom est dans `detail`).
export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id: int("id").primaryKey().autoincrement(),
    adminId: int("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 40 }).notNull(), // "view" | "update" | "disable" | "anonymize" | "delete"
    targetUserId: int("target_user_id").references((): AnyMySqlColumn => users.id, { onDelete: "set null" }),
    detail: varchar("detail", { length: 300 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("audit_admin_idx").on(t.adminId), index("audit_target_idx").on(t.targetUserId)],
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
  icon: varchar("icon", { length: 60 }), // classe FontAwesome (ex. « fa-solid fa-graduation-cap »), facultative
  position: int("position").notNull().default(0),
});

// ---------- Tickets (support) ----------

export const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const tickets = mysqlTable(
  "tickets",
  {
    id: int("id").primaryKey().autoincrement(),
    title: varchar("title", { length: 150 }).notNull(),
    body: text("body").notNull(),
    status: mysqlEnum("status", TICKET_STATUSES).notNull().default("open"),
    createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Qui a fait la dernière action (commentaire ou changement de statut) : sert à savoir si l'auteur du ticket a
    // une réponse à lire (si ce n'est pas lui qui a agi en dernier).
    lastActorId: int("last_actor_id").references(() => users.id),
    ownerReadAt: datetime("owner_read_at"), // dernière fois que l'auteur a consulté son ticket
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("tickets_user_idx").on(t.createdBy, t.createdAt)],
);

export const ticketFiles = mysqlTable(
  "ticket_files",
  {
    id: int("id").primaryKey().autoincrement(),
    ticketId: int("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    file: varchar("file", { length: 60 }).notNull(),
    originalName: varchar("original_name", { length: 200 }).notNull(),
    mime: varchar("mime", { length: 60 }).notNull(),
    size: int("size").notNull(),
    uploadedBy: int("uploaded_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("tf_ticket_idx").on(t.ticketId)],
);

export const ticketComments = mysqlTable(
  "ticket_comments",
  {
    id: int("id").primaryKey().autoincrement(),
    ticketId: int("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("tc_ticket_idx").on(t.ticketId, t.createdAt)],
);

// ---------- Nouveautés internes (changelog discret, affiché dans la cloche) ----------

export const UPDATE_KINDS = ["feature", "fix", "maintenance"] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const updates = mysqlTable("updates", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  kind: mysqlEnum("kind", UPDATE_KINDS).notNull().default("feature"),
  // Mise en avant (facultatif) : en plus de la cloche, envoie une notification push à qui l'a activé.
  important: boolean("important").notNull().default(false),
  authorId: int("author_id").notNull().references(() => users.id),
  // Date de fin de publication (facultative) : passé cette date, la nouveauté n'est plus affichée (cloche, page
  // /nouveautes) mais reste enregistrée et modifiable en admin.
  publishUntil: datetime("publish_until"),
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

// ---------- Banque de questions des quiz de cours (Réseaux, Mécanique, Électricité, Lumière…) ----------

export const quizQuestions = mysqlTable(
  "quiz_questions",
  {
    id: int("id").primaryKey().autoincrement(),
    courseKey: varchar("course_key", { length: 40 }).notNull(), // clé du cours (src/lib/course-data.ts), ex. "reseaux"
    question: varchar("question", { length: 500 }).notNull(),
    choiceA: varchar("choice_a", { length: 300 }).notNull(),
    choiceB: varchar("choice_b", { length: 300 }).notNull(),
    choiceC: varchar("choice_c", { length: 300 }).notNull(),
    choiceD: varchar("choice_d", { length: 300 }).notNull(),
    answer: int("answer").notNull(), // 0 = A, 1 = B, 2 = C, 3 = D
    createdBy: int("created_by").notNull().references(() => users.id),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("qq_course_idx").on(t.courseKey)],
);

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

export const WORK_KINDS = ["ecole", "entreprise", "conge", "ferie", "maladie"] as const;
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

// Pointeuse : lignes d'heures saisies à la main (un jour peut avoir plusieurs lignes, ex. matin + après-midi).
// Les jours « école », « congé » et « maladie » (work_days.kind) priment dessus : voir src/lib/pointeuse.ts.
export const timeEntries = mysqlTable(
  "time_entries",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    // Jour de fin : égal à « day » la plupart du temps, ou le lendemain pour une ligne qui passe minuit (ex. 21h à 3h).
    endDay: date("end_day", { mode: "string" }).notNull(),
    startMinutes: int("start_minutes").notNull(), // minutes depuis minuit (0-1439)
    endMinutes: int("end_minutes").notNull(),
    pauseMinutes: int("pause_minutes").notNull().default(0),
    comment: varchar("comment", { length: 300 }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("te_user_day_idx").on(t.userId, t.day)],
);

// Carnet de compétences : une entrée par mission (un jour, ou une période de plusieurs jours), sans durée chiffrée.
export const workLogs = mysqlTable(
  "work_logs",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    endDay: date("end_day", { mode: "string" }).notNull(), // égal à « day » pour une seule journée
    place: mysqlEnum("place", ["entreprise", "ecole"]).notNull().default("entreprise"),
    title: varchar("title", { length: 150 }), // facultatif : sinon la période fait office de titre dans la liste
    mission: text("mission").notNull(),
    skills: varchar("skills", { length: 300 }), // compétences travaillées, séparées par des virgules
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("wl_user_day_idx").on(t.userId, t.day)],
);

// Photos d'une entrée du journal de bord (à côté du texte, pas mêlées dedans) : plusieurs par entrée.
export const workLogFiles = mysqlTable(
  "work_log_files",
  {
    id: int("id").primaryKey().autoincrement(),
    workLogId: int("work_log_id").notNull().references(() => workLogs.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 60 }).notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("wlf_log_idx").on(t.workLogId)],
);

// Note de frais : photo du reçu + date/heure/lieu/prix, avec un commentaire prêt à copier-coller pour l'entreprise.
export const expenseNotes = mysqlTable(
  "expense_notes",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    photoFile: varchar("photo_file", { length: 60 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    time: varchar("time", { length: 5 }).notNull(), // "HH:MM"
    moment: mysqlEnum("moment", ["matin", "midi", "soir", "autre"]).notNull().default("midi"),
    placeName: varchar("place_name", { length: 120 }).notNull().default(""), // nom du commerce/lieu (ex. "Décathlon")
    place: varchar("place", { length: 200 }).notNull(), // adresse
    businessNumber: varchar("business_number", { length: 60 }).notNull().default(""), // numéro d'affaire (suggestions : déjà utilisés par la même personne)
    priceCents: int("price_cents").notNull(),
    comment: text("comment").notNull(), // texte complet prêt à copier (régénéré à chaque enregistrement depuis les champs ci-dessous + extraComment)
    extraComment: text("extra_comment").notNull().default(""), // précision libre saisie par la personne (séparée du texte complet, pour pré-remplir le formulaire de modification)
    tvaRate: varchar("tva_rate", { length: 10 }), // "20", "10", ou null si non précisé/autre
    tvaCents: int("tva_cents"), // montant de TVA en centimes : calculé automatiquement depuis tvaRate au moment de la saisie, mais toujours modifiable à la main
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("exp_user_date_idx").on(t.userId, t.date)],
);

// Photos supplémentaires d'une note de frais (plusieurs reçus pour une même dépense) : la première reste dans
// expenseNotes.photoFile (vignette de la liste, compat des liens existants), les suivantes sont ici.
export const expenseFiles = mysqlTable(
  "expense_files",
  {
    id: int("id").primaryKey().autoincrement(),
    expenseNoteId: int("expense_note_id").notNull().references(() => expenseNotes.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 60 }).notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("expf_note_idx").on(t.expenseNoteId)],
);

// Scores de l'espace détente (Tetris pour l'instant, « game » laisse la place à d'autres mini-jeux plus tard).
export const detenteScores = mysqlTable(
  "detente_scores",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    game: varchar("game", { length: 30 }).notNull().default("tetris"),
    score: int("score").notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("ds_game_score_idx").on(t.game, t.score), index("ds_user_idx").on(t.userId)],
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
    outletAmps: int("outlet_amps").notNull().default(16),
    outletCount: int("outlet_count"), // nombre de prises voulu (par départ si la ligne est divisée) ; vide = le minimum calculé
 // calibre des prises de courant de la ligne (16, 32 ou 63 A)
    mode: mysqlEnum("mode", ["mono", "tetra"]).notNull().default("tetra"), // ligne monophasée ou tétraphasée (3 phases + neutre)
    position: int("position").notNull().default(0),
  },
  (t) => [index("pc_project_idx").on(t.projectId)],
);

// Un départ d'une ligne divisée (feederAmps) : nommé et réglé librement par l'utilisateur. Les appareils qui n'ont pas
// de départ choisi explicitement sont répartis automatiquement entre les départs existants (toujours sur le moins chargé).
export const powerFeeders = mysqlTable(
  "power_feeders",
  {
    id: int("id").primaryKey().autoincrement(),
    circuitId: int("circuit_id").notNull().references(() => powerCircuits.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    outletCount: int("outlet_count"), // nombre de prises voulu pour ce départ ; vide = le minimum calculé
    position: int("position").notNull().default(0),
  },
  (t) => [index("pf_circuit_idx").on(t.circuitId)],
);

export const ITEM_PRIORITIES = ["essentiel", "normal", "optionnel"] as const;
export type ItemPriority = (typeof ITEM_PRIORITIES)[number];

export const powerItems = mysqlTable(
  "power_items",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    circuitId: int("circuit_id").references(() => powerCircuits.id, { onDelete: "set null" }),
    // Départ choisi explicitement (doit appartenir à la même ligne) ; vide = réparti automatiquement entre les départs.
    feederId: int("feeder_id").references(() => powerFeeders.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    watts: int("watts").notNull(),
    qty: int("qty").notNull().default(1),
    // Nécessite une alimentation triphasée (moteur, gradateur tri…) : exclu automatiquement du calcul si sa ligne est
    // monophasée, plutôt que de fausser silencieusement la charge.
    requiresTetra: boolean("requires_tetra").notNull().default(false),
    // Sert au délestage automatique quand une ligne est en surcharge : on retire d'abord les appareils « optionnel »,
    // puis « normal », jamais les « essentiel ».
    priority: mysqlEnum("priority", ITEM_PRIORITIES).notNull().default("normal"),
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

// ---------- Messagerie (annonces et messages directs) et avis ----------

// Une conversation par annonce et par personne intéressée (acheteur) avec l'auteur de l'annonce (vendeur).
// listingId vaut null pour un message direct (depuis l'annuaire, hors annonce) : buyerId est alors la personne qui a écrit en premier.
// kind = "group" : conversation à plusieurs, les vraies participantes sont dans conversationMembers (pas buyer/sellerId,
// qui valent toutes les deux l'id de la personne qui a créé le groupe — gardées non nulles pour ne pas toucher au
// reste du code annonces/DM, mais ignorées pour un groupe).
export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").primaryKey().autoincrement(),
    listingId: int("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["listing", "dm", "group"]).notNull().default("dm"),
    name: varchar("name", { length: 120 }), // nom du groupe (kind = "group" uniquement)
    buyerId: int("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: int("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    buyerReadAt: datetime("buyer_read_at"),
    sellerReadAt: datetime("seller_read_at"),
    lastMessageAt: datetime("last_message_at").notNull().$defaultFn(() => new Date()),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("conv_listing_buyer_idx").on(t.listingId, t.buyerId), index("conv_buyer_idx").on(t.buyerId), index("conv_seller_idx").on(t.sellerId)],
);

// Participantes d'une conversation de groupe (kind = "group" seulement). readAt : lu par cette personne jusqu'à quand.
// leftAt : a quitté le groupe (ne reçoit plus rien, disparaît de sa liste, mais l'historique reste pour les autres).
export const conversationMembers = mysqlTable(
  "conversation_members",
  {
    id: int("id").primaryKey().autoincrement(),
    conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    readAt: datetime("read_at"),
    joinedAt: datetime("joined_at").notNull().$defaultFn(() => new Date()),
    leftAt: datetime("left_at"),
  },
  (t) => [uniqueIndex("cm_conv_user_idx").on(t.conversationId, t.userId), index("cm_user_idx").on(t.userId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").primaryKey().autoincrement(),
    conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: int("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    replyToId: int("reply_to_id"), // message cité en réponse (même conversation) ; pas de clé étrangère auto-référencée, vérifié en code
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("msg_conv_idx").on(t.conversationId, t.createdAt)],
);

// Photos, GIF et fichiers joints à un message. Les fichiers sont dans data/uploads/messages et servis par
// /api/messages/[id]/files/[fileId], réservé aux deux participants de la conversation (comme ticketFiles).
export const messageAttachments = mysqlTable(
  "message_attachments",
  {
    id: int("id").primaryKey().autoincrement(),
    messageId: int("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
    file: varchar("file", { length: 60 }).notNull(),
    originalName: varchar("original_name", { length: 200 }).notNull(),
    mime: varchar("mime", { length: 60 }).notNull(),
    size: int("size").notNull(),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("ma_message_idx").on(t.messageId)],
);

// Conversations en sourdine : aucune notification push tant qu'elle y figure (l'historique reste visible normalement).
export const conversationMutes = mysqlTable(
  "conversation_mutes",
  {
    conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);

// Note privée qu'une personne garde sur une autre (ex. depuis une conversation) : jamais visible par la personne concernée.
export const personalNotes = mysqlTable(
  "personal_notes",
  {
    id: int("id").primaryKey().autoincrement(),
    authorId: int("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    aboutUserId: int("about_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("pn_author_about_idx").on(t.authorId, t.aboutUserId)],
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


// Bilan de puissance (calculette) : la liste de matériel de la personne, gardée pour la retrouver où qu'elle se connecte.
export const calcSupplyLists = mysqlTable("calc_supply_lists", {
  userId: int("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["mono", "tetra"]).notNull().default("tetra"),
  items: mediumtext("items").notNull().default("[]"), // JSON : [{ name, watts, qty }]
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()),
});

// Recherche d'entreprises (alternance) : annuaire PARTAGÉ entre tous (les infos générales d'une entreprise ne
// dépendent de personne en particulier), alimenté par les ajouts manuels et les imports CSV de tout le monde.
export const altCompanies = mysqlTable(
  "alt_companies",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 200 }).notNull(),
    nameKey: varchar("name_key", { length: 220 }).notNull(), // nom + ville normalisés (minuscules, sans accents) : évite les doublons entre imports de personnes différentes
    city: varchar("city", { length: 120 }).notNull().default(""),
    department: varchar("department", { length: 20 }).notNull().default(""),
    sector: varchar("sector", { length: 150 }).notNull().default(""), // ex. "Prestation", "Parc d'attraction"… libre
    address: varchar("address", { length: 300 }).notNull().default(""),
    types: varchar("types", { length: 40 }).notNull().default(""), // sous-ensemble de son,lumiere,video séparés par virgule
    salary: varchar("salary", { length: 120 }).notNull().default(""),
    sources: varchar("sources", { length: 200 }).notNull().default(""),
    perks: varchar("perks", { length: 300 }).notNull().default(""), // "avantage"
    contactTitle: varchar("contact_title", { length: 120 }).notNull().default(""),
    contactName: varchar("contact_name", { length: 150 }).notNull().default(""),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    email: varchar("email", { length: 300 }).notNull().default(""), // peut contenir plusieurs adresses séparées par ;
    // Un import CSV ou un ajout manuel atterrit d'abord dans le tableau de la personne (published=false) : elle vérifie,
    // puis publie elle-même ce qu'elle veut dans l'annuaire commun. Les entreprises déjà seedées (ex. listing
    // Nouvelle-Aquitaine) restent publiées par défaut (valeur par défaut true, jamais touchée pour elles).
    published: boolean("published").notNull().default(true),
    createdByUserId: int("created_by_user_id").references((): AnyMySqlColumn => users.id, { onDelete: "set null" }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("alt_companies_name_key").on(t.nameKey), index("alt_companies_city_idx").on(t.city)],
);

// Couleurs possibles pour un statut d'entreprise, gérées en admin : jeu fermé car Tailwind doit voir les classes
// écrites en toutes lettres quelque part dans le code (lib/company-status.ts) pour les inclure au build.
export const STATUS_COLORS = ["zinc", "slate", "red", "rose", "orange", "amber", "emerald", "teal", "sky", "blue", "indigo", "violet", "pink"] as const;

// Statuts d'entreprise (recherche d'alternance) : liste gérée en admin (Admin > Statuts entreprises), avec une
// couleur par statut qui colore toute la ligne dans le tableau de suivi.
export const companyStatuses = mysqlTable("company_statuses", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  label: varchar("label", { length: 60 }).notNull(),
  color: mysqlEnum("color", STATUS_COLORS).notNull().default("zinc"),
  position: int("position").notNull().default(0),
});

// Suivi de candidature d'UNE personne pour UNE entreprise : « ajouter à mon tableau » crée cette ligne, vide au
// départ (sauf import CSV, qui la remplit directement). Jamais partagé : chacun voit et édite seulement les siennes.
export const altCompanySearches = mysqlTable(
  "alt_company_searches",
  {
    id: int("id").primaryKey().autoincrement(),
    companyId: int("company_id").notNull().references(() => altCompanies.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["offre", "spontanee"]),
    // Clé vers company_statuses.key (pas de FK : la liste des statuts est modifiable en admin, et un statut qu'on a
    // supprimé ne doit pas empêcher de lire les anciennes lignes qui l'utilisaient encore).
    status: varchar("status", { length: 40 }),
    priority: mysqlEnum("priority", ["faible", "moyenne", "haute"]),
    lastContactDate: date("last_contact_date", { mode: "string" }),
    delayDays: int("delay_days"), // nombre de jours après lastContactDate : passé ce délai, la ligne passe en rouge et un rappel (mail + push) part une fois
    delayAlertSentAt: datetime("delay_alert_sent_at"), // évite de renvoyer le rappel chaque jour ; remis à zéro si lastContactDate ou delayDays change
    note: text("note").notNull().default(""),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("alt_search_company_user").on(t.companyId, t.userId), index("alt_search_user_idx").on(t.userId)],
);

export const CONTACT_TYPES = ["appel", "mail", "physique"] as const;

// Historique des contacts pour UN suivi de candidature (vrai CRM : base d'appel/mail/visite avec un commentaire).
// Ajouter un contact met aussi à jour altCompanySearches.lastContactDate (si plus récent) et réarme le rappel de délai.
export const companyContacts = mysqlTable(
  "company_contacts",
  {
    id: int("id").primaryKey().autoincrement(),
    searchId: int("search_id").notNull().references(() => altCompanySearches.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", CONTACT_TYPES).notNull(),
    contactDate: date("contact_date", { mode: "string" }).notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("company_contacts_search_idx").on(t.searchId)],
);

// Entretiens pour UN suivi de candidature : plusieurs possibles (un bouton "+ ajouter un entretien" dans l'app).
export const companyInterviews = mysqlTable(
  "company_interviews",
  {
    id: int("id").primaryKey().autoincrement(),
    searchId: int("search_id").notNull().references(() => altCompanySearches.id, { onDelete: "cascade" }),
    interviewDate: date("interview_date", { mode: "string" }).notNull(),
    note: varchar("note", { length: 255 }).notNull().default(""),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("company_interviews_search_idx").on(t.searchId)],
);

export const RESOURCE_CATEGORIES = ["outils", "sites_ressources", "jobboards", "sites_carrieres"] as const;

// Liens utiles pour la recherche d'alternance (outils, sites ressources, jobboards, sites carrières) : liste
// PARTAGÉE que n'importe qui peut compléter (un champ pour ajouter une autre page), avec juste un favori personnel
// (pas de suivi détaillé comme pour les entreprises, un simple lien n'en a pas besoin).
export const resourceLinks = mysqlTable(
  "resource_links",
  {
    id: int("id").primaryKey().autoincrement(),
    category: mysqlEnum("category", RESOURCE_CATEGORIES).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    description: varchar("description", { length: 300 }).notNull().default(""),
    createdByUserId: int("created_by_user_id").references((): AnyMySqlColumn => users.id, { onDelete: "set null" }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("resource_links_category_idx").on(t.category)],
);

export const resourceFavorites = mysqlTable(
  "resource_favorites",
  {
    resourceId: int("resource_id").notNull().references(() => resourceLinks.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.userId] })],
);

// Banque de mails PARTAGÉE (recherche d'alternance) : contacts utiles (RH, casting, prod…) avec leur email, pour
// prospecter — filtrable par nom/email/catégorie. N'importe qui peut compléter, comme les autres listes partagées.
export const emailBankEntries = mysqlTable(
  "email_bank_entries",
  {
    id: int("id").primaryKey().autoincrement(),
    label: varchar("label", { length: 150 }).notNull(), // ex. "RH — Nom Entreprise"
    email: varchar("email", { length: 300 }).notNull(),
    category: varchar("category", { length: 80 }).notNull().default(""), // libre : "RH", "Casting", "Prod"…
    note: varchar("note", { length: 300 }).notNull().default(""),
    createdByUserId: int("created_by_user_id").references((): AnyMySqlColumn => users.id, { onDelete: "set null" }),
    createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("email_bank_category_idx").on(t.category)],
);
