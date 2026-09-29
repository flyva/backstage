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
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "bde", "member"]).notNull().default("member"),
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
