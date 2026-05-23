import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  bigint,
  timestamp,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 32 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saves = pgTable(
  "saves",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    slot: integer("slot").notNull(),
    name: varchar("name", { length: 64 }),
    gameState: jsonb("game_state").notNull(),
    worldData: text("world_data").notNull(),
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userSlotUnique: unique().on(table.userId, table.slot),
  }),
);
