import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { ADMIN_DISPLAY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME } from "./adminAccount";
import { CIRCLE_SIZE, PER_PERSON_FLOAT, PLANNED_TREASURY, TREASURY_BUFFER } from "./money";
import type {
  ChatMessage,
  Conversation,
  ExchangeBooking,
  ExchangeRequest,
  Listing,
  Transaction,
  User,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "payme.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

let db: Database.Database | null = null;

export function uploadsDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  ensureAdminAccount(db);
  ensureLegalNames(db);
  ensureCashOnlyBalances(db);
  ensureDefaults(db);
  ensureListingPhotos(db);
  return db;
}

function ensureDefaults(database: Database.Database) {
  const ignore = database.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  ignore.run("cny_per_payme", "10");
  ignore.run("cny_reserve", String(PLANNED_TREASURY * 10));
  ignore.run("planned_people", String(CIRCLE_SIZE));
  ignore.run("per_person_float", String(PER_PERSON_FLOAT));

  const users = database
    .prepare("SELECT id FROM users WHERE username IS NOT NULL AND role != 'admin'")
    .all() as { id: string }[];
  const add = database.prepare(
    "INSERT OR IGNORE INTO contacts (user_id, contact_id, created_at) VALUES (?, ?, ?)",
  );
  const now = Date.now();
  for (const a of users) {
    for (const b of users) {
      if (a.id === b.id) continue;
      add.run(a.id, b.id, now);
    }
  }
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE,
      display_name TEXT,
      first_name TEXT,
      last_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      balance_payme REAL NOT NULL DEFAULT 0,
      display_currency TEXT NOT NULL DEFAULT 'CNY',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      from_user_id TEXT,
      to_user_id TEXT,
      amount_payme REAL NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      fiat_amount REAL,
      fiat_currency TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_payme REAL NOT NULL,
      image_paths TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      buyer_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS exchange_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT,
      side TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at INTEGER NOT NULL,
      filled_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exchange_bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      side TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'user'
    );
  `);
  addColumn(database, "users", "first_name", "TEXT");
  addColumn(database, "users", "last_name", "TEXT");
}

function addColumn(database: Database.Database, table: string, column: string, def: string) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}

function ensureAdminAccount(database: Database.Database) {
  const admin = database.prepare("SELECT id, email, username FROM users WHERE role = 'admin' LIMIT 1").get() as
    | { id: string; email: string; username: string }
    | undefined;
  if (!admin) return;
  if (admin.email.toLowerCase() === ADMIN_EMAIL && admin.username === ADMIN_USERNAME) return;

  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const taken = database
    .prepare("SELECT id, role FROM users WHERE lower(email) = lower(?)")
    .get(ADMIN_EMAIL) as { id: string; role: string } | undefined;
  if (taken && taken.role !== "admin" && taken.id !== admin.id) {
    database
      .prepare("UPDATE users SET email = ? WHERE id = ?")
      .run(`moved-${taken.id.slice(0, 8)}@payme.local`, taken.id);
  }
  database
    .prepare(
      "UPDATE users SET email = ?, password_hash = ?, username = ?, display_name = ?, first_name = COALESCE(first_name, ?), last_name = COALESCE(last_name, ?) WHERE id = ?",
    )
    .run(ADMIN_EMAIL, hash, ADMIN_USERNAME, ADMIN_DISPLAY, "Nicholas", "Ma", admin.id);
}

function ensureLegalNames(database: Database.Database) {
  const defaults: { username: string; first: string; last: string }[] = [
    { username: ADMIN_USERNAME, first: "Nicholas", last: "Ma" },
    { username: "luna", first: "Luna", last: "Chen" },
    { username: "kai", first: "Kai", last: "Rivera" },
    { username: "nova", first: "Nova", last: "Kim" },
  ];
  const update = database.prepare(
    `UPDATE users SET first_name = ?, last_name = ?
     WHERE lower(username) = lower(?)
       AND (first_name IS NULL OR trim(first_name) = '' OR last_name IS NULL OR trim(last_name) = '')`,
  );
  for (const row of defaults) {
    update.run(row.first, row.last, row.username);
  }
}

function writeListingImage(filename: string, title: string, accent: string) {
  const dir = uploadsDir();
  const safe = title.replace(/[<>&]/g, "");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2a2118"/>
      <stop offset="100%" stop-color="#16120e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  <circle cx="980" cy="160" r="220" fill="${accent}" opacity="0.22"/>
  <circle cx="180" cy="720" r="140" fill="#e0b56a" opacity="0.08"/>
  <text x="80" y="760" fill="#e0b56a" font-family="Georgia, serif" font-size="64">${safe}</text>
  <text x="80" y="820" fill="#b5a48a" font-family="sans-serif" font-size="28">Pay Me 拍卖</text>
</svg>`;
  fs.writeFileSync(path.join(dir, filename), svg);
}

function ensureListingPhotos(database: Database.Database) {
  const rows = database
    .prepare("SELECT id, title, image_paths FROM listings")
    .all() as { id: string; title: string; image_paths: string }[];
  for (const row of rows) {
    let paths: string[] = [];
    try {
      paths = JSON.parse(row.image_paths || "[]");
    } catch {
      paths = [];
    }
    if (paths.length) continue;
    const name = `seed-${row.id.slice(0, 8)}.svg`;
    const accent = row.title.includes("相机") ? "#f7931a" : "#0ecb81";
    writeListingImage(name, row.title, accent);
    database.prepare("UPDATE listings SET image_paths = ? WHERE id = ?").run(JSON.stringify([name]), row.id);
  }
}

function seed(database: Database.Database) {
  const existing = database.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) return;

  const now = Date.now();
  const adminId = crypto.randomUUID();
  const lunaId = crypto.randomUUID();
  const kaiId = crypto.randomUUID();
  const novaId = crypto.randomUUID();

  const insertUser = database.prepare(`
    INSERT INTO users (id, email, password_hash, username, display_name, first_name, last_name, role, balance_payme, display_currency, created_at)
    VALUES (@id, @email, @password_hash, @username, @display_name, @first_name, @last_name, @role, @balance_payme, @display_currency, @created_at)
  `);

  insertUser.run({
    id: adminId,
    email: ADMIN_EMAIL,
    password_hash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    username: ADMIN_USERNAME,
    display_name: ADMIN_DISPLAY,
    first_name: "Nicholas",
    last_name: "Ma",
    role: "admin",
    balance_payme: PLANNED_TREASURY,
    display_currency: "CNY",
    created_at: now,
  });

  insertUser.run({
    id: lunaId,
    email: "luna@payme.app",
    password_hash: bcrypt.hashSync("friends123", 10),
    username: "luna",
    display_name: "Luna",
    first_name: "Luna",
    last_name: "Chen",
    role: "user",
    balance_payme: 0,
    display_currency: "CNY",
    created_at: now,
  });

  insertUser.run({
    id: kaiId,
    email: "kai@payme.app",
    password_hash: bcrypt.hashSync("friends123", 10),
    username: "kai",
    display_name: "Kai",
    first_name: "Kai",
    last_name: "Rivera",
    role: "user",
    balance_payme: 0,
    display_currency: "USD",
    created_at: now,
  });

  insertUser.run({
    id: novaId,
    email: "nova@payme.app",
    password_hash: bcrypt.hashSync("friends123", 10),
    username: "nova",
    display_name: "Nova",
    first_name: "Nova",
    last_name: "Kim",
    role: "user",
    balance_payme: 0,
    display_currency: "CNY",
    created_at: now,
  });

  database
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    .run("cny_per_payme", "10");
  database
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    .run("cny_reserve", String(PLANNED_TREASURY * 10));
  database
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    .run("planned_people", String(CIRCLE_SIZE));
  database
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    .run("per_person_float", String(PER_PERSON_FLOAT));

  const listing = database.prepare(`
    INSERT INTO listings (id, seller_id, title, description, price_payme, image_paths, status, buyer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, ?)
  `);
  listing.run(
    crypto.randomUUID(),
    lunaId,
    "胶片相机",
    "能用的银盐机，适合周末拍朋友。当面看货，Pay Me 直接付款。",
    85,
    JSON.stringify([]),
    now,
  );
  listing.run(
    crypto.randomUUID(),
    kaiId,
    "手工冷萃壶",
    "自己用了两个月，想换成下一件玩具。",
    36,
    JSON.stringify([]),
    now,
  );
  listing.run(
    crypto.randomUUID(),
    novaId,
    "二手机械键盘",
    "青轴，键帽还在。当面看货，Pay Me 直接付。",
    54,
    JSON.stringify([]),
    now,
  );
  ensureListingPhotos(database);
}

function ensureCashOnlyBalances(database: Database.Database) {
  const done = database.prepare("SELECT value FROM settings WHERE key = ?").get("cash_only_reclaim") as
    | { value: string }
    | undefined;
  if (done?.value === "1") return;

  const admin = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as
    | { id: string }
    | undefined;
  if (!admin) return;

  const holders = database
    .prepare("SELECT id, username, balance_payme FROM users WHERE role != 'admin' AND balance_payme > 1e-9")
    .all() as { id: string; username: string | null; balance_payme: number }[];

  const run = database.transaction(() => {
    const insertTx = database.prepare(`
      INSERT INTO transactions (id, from_user_id, to_user_id, amount_payme, type, note, fiat_amount, fiat_currency, created_at)
      VALUES (?, ?, ?, ?, 'adjust', ?, NULL, NULL, ?)
    `);
    const now = Date.now();
    for (const holder of holders) {
      const amount = Number(holder.balance_payme);
      if (amount <= 0) continue;
      database.prepare("UPDATE users SET balance_payme = balance_payme - ? WHERE id = ?").run(amount, holder.id);
      database.prepare("UPDATE users SET balance_payme = balance_payme + ? WHERE id = ?").run(amount, admin.id);
      insertTx.run(
        crypto.randomUUID(),
        holder.id,
        admin.id,
        amount,
        `现金制度：未当面兑换的余额已收回 @${holder.username || "user"}`,
        now,
      );
    }
    database
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('cash_only_reclaim', '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
      )
      .run();
  });
  run();
}

export function getSetting(key: string, fallback = ""): string {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    username: (row.username as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    role: row.role === "admin" ? "admin" : "user",
    balancePayme: Number(row.balance_payme),
    displayCurrency: String(row.display_currency || "CNY"),
    createdAt: Number(row.created_at),
  };
}

export function findUserByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...mapUser(row), passwordHash: String(row.password_hash) };
}

export function findUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : null;
}

export function findUserByUsername(username: string): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(username) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
}

export function createUser(email: string, passwordHash: string): User {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, password_hash, username, display_name, role, balance_payme, display_currency, created_at)
       VALUES (?, ?, ?, NULL, NULL, 'user', 0, 'CNY', ?)`,
    )
    .run(id, email.toLowerCase(), passwordHash, createdAt);
  return findUserById(id)!;
}

export function setUsername(userId: string, username: string, displayName: string) {
  getDb()
    .prepare("UPDATE users SET username = ?, display_name = ? WHERE id = ?")
    .run(username, displayName, userId);
}

export function setLegalName(userId: string, firstName: string, lastName: string): User {
  getDb()
    .prepare("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?")
    .run(firstName, lastName, userId);
  const user = findUserById(userId);
  if (!user) throw new Error("用户不存在");
  return user;
}

export function setDisplayCurrency(userId: string, currency: string) {
  getDb().prepare("UPDATE users SET display_currency = ? WHERE id = ?").run(currency, userId);
}

export function listUsers(): User[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];
  return rows.map(mapUser);
}

export function searchUsers(query: string, exceptId: string): User[] {
  const q = `%${query.toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM users
       WHERE id != ? AND username IS NOT NULL
         AND (lower(username) LIKE ? OR lower(display_name) LIKE ?)
       ORDER BY username LIMIT 12`,
    )
    .all(exceptId, q, q) as Record<string, unknown>[];
  return rows.map(mapUser);
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);
  return token;
}

export function userFromSession(token: string | undefined | null): User | null {
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getAdmin(): User {
  const row = getDb().prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new Error("管理员账户未初始化");
  return mapUser(row);
}

export function transferPayme(params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  type: Transaction["type"];
  note?: string;
  fiatAmount?: number;
  fiatCurrency?: string;
}): Transaction {
  const database = getDb();
  const run = database.transaction(() => {
    const from = findUserById(params.fromUserId);
    const to = findUserById(params.toUserId);
    if (!from || !to) throw new Error("用户不存在");
    if (from.id === to.id) throw new Error("不能付给自己");
    if (from.balancePayme < params.amount - 1e-9) {
      throw new Error("余额不足");
    }
    database
      .prepare("UPDATE users SET balance_payme = balance_payme - ? WHERE id = ?")
      .run(params.amount, from.id);
    database
      .prepare("UPDATE users SET balance_payme = balance_payme + ? WHERE id = ?")
      .run(params.amount, to.id);
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    database
      .prepare(
        `INSERT INTO transactions (id, from_user_id, to_user_id, amount_payme, type, note, fiat_amount, fiat_currency, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        from.id,
        to.id,
        params.amount,
        params.type,
        params.note ?? null,
        params.fiatAmount ?? null,
        params.fiatCurrency ?? null,
        createdAt,
      );
    return {
      id,
      fromUserId: from.id,
      toUserId: to.id,
      amountPayme: params.amount,
      type: params.type,
      note: params.note ?? null,
      fiatAmount: params.fiatAmount ?? null,
      fiatCurrency: params.fiatCurrency ?? null,
      createdAt,
      fromUsername: from.username,
      toUsername: to.username,
    } satisfies Transaction;
  });
  return run();
}

export function adjustCnyReserve(delta: number) {
  const current = Number(getSetting("cny_reserve", "0"));
  setSetting("cny_reserve", String(Math.max(0, current + delta)));
}

export function listActivity(userId: string, limit = 30): Transaction[] {
  const rows = getDb()
    .prepare(
      `SELECT t.*, fu.username AS from_username, tu.username AS to_username
       FROM transactions t
       LEFT JOIN users fu ON fu.id = t.from_user_id
       LEFT JOIN users tu ON tu.id = t.to_user_id
       WHERE t.from_user_id = ? OR t.to_user_id = ?
       ORDER BY t.created_at DESC
       LIMIT ?`,
    )
    .all(userId, userId, limit) as Record<string, unknown>[];
  return rows.map(mapTx);
}

export function listAllTransactions(limit = 80): Transaction[] {
  const rows = getDb()
    .prepare(
      `SELECT t.*, fu.username AS from_username, tu.username AS to_username
       FROM transactions t
       LEFT JOIN users fu ON fu.id = t.from_user_id
       LEFT JOIN users tu ON tu.id = t.to_user_id
       ORDER BY t.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(mapTx);
}

function mapTx(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    fromUserId: (row.from_user_id as string | null) ?? null,
    toUserId: (row.to_user_id as string | null) ?? null,
    amountPayme: Number(row.amount_payme),
    type: row.type as Transaction["type"],
    note: (row.note as string | null) ?? null,
    fiatAmount: row.fiat_amount == null ? null : Number(row.fiat_amount),
    fiatCurrency: (row.fiat_currency as string | null) ?? null,
    createdAt: Number(row.created_at),
    fromUsername: (row.from_username as string | null) ?? null,
    toUsername: (row.to_username as string | null) ?? null,
  };
}

export function createListing(params: {
  sellerId: string;
  title: string;
  description: string;
  pricePayme: number;
  imagePaths: string[];
}): Listing {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO listings (id, seller_id, title, description, price_payme, image_paths, status, buyer_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, ?)`,
    )
    .run(
      id,
      params.sellerId,
      params.title,
      params.description,
      params.pricePayme,
      JSON.stringify(params.imagePaths),
      createdAt,
    );
  return getListing(id)!;
}

export function getListing(id: string): Listing | null {
  const row = getDb()
    .prepare(
      `SELECT l.*, s.username AS seller_username, b.username AS buyer_username
       FROM listings l
       JOIN users s ON s.id = l.seller_id
       LEFT JOIN users b ON b.id = l.buyer_id
       WHERE l.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapListing(row) : null;
}

export function listListings(status?: "active" | "sold"): Listing[] {
  const sql = status
    ? `SELECT l.*, s.username AS seller_username, b.username AS buyer_username
       FROM listings l
       JOIN users s ON s.id = l.seller_id
       LEFT JOIN users b ON b.id = l.buyer_id
       WHERE l.status = ?
       ORDER BY l.created_at DESC`
    : `SELECT l.*, s.username AS seller_username, b.username AS buyer_username
       FROM listings l
       JOIN users s ON s.id = l.seller_id
       LEFT JOIN users b ON b.id = l.buyer_id
       ORDER BY l.created_at DESC`;
  const rows = (
    status ? getDb().prepare(sql).all(status) : getDb().prepare(sql).all()
  ) as Record<string, unknown>[];
  return rows.map(mapListing);
}

function mapListing(row: Record<string, unknown>): Listing {
  let imagePaths: string[] = [];
  try {
    imagePaths = JSON.parse(String(row.image_paths || "[]"));
  } catch {
    imagePaths = [];
  }
  return {
    id: String(row.id),
    sellerId: String(row.seller_id),
    title: String(row.title),
    description: String(row.description),
    pricePayme: Number(row.price_payme),
    imagePaths,
    status: row.status === "sold" ? "sold" : "active",
    buyerId: (row.buyer_id as string | null) ?? null,
    createdAt: Number(row.created_at),
    sellerUsername: String(row.seller_username || ""),
    buyerUsername: (row.buyer_username as string | null) ?? null,
  };
}

export function buyListing(listingId: string, buyerId: string): Listing {
  const listing = getListing(listingId);
  if (!listing) throw new Error("商品不存在");
  if (listing.status !== "active") throw new Error("已经卖掉了");
  if (listing.sellerId === buyerId) throw new Error("不能买自己的东西");
  transferPayme({
    fromUserId: buyerId,
    toUserId: listing.sellerId,
    amount: listing.pricePayme,
    type: "auction",
    note: `拍卖：${listing.title}`,
  });
  getDb()
    .prepare("UPDATE listings SET status = 'sold', buyer_id = ? WHERE id = ?")
    .run(buyerId, listingId);
  return getListing(listingId)!;
}

export function addContact(userId: string, contactId: string) {
  if (userId === contactId) throw new Error("不能添加自己");
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO contacts (user_id, contact_id, created_at) VALUES (?, ?, ?)`,
    )
    .run(userId, contactId, Date.now());
}

export function listContacts(userId: string): User[] {
  const rows = getDb()
    .prepare(
      `SELECT u.* FROM contacts c JOIN users u ON u.id = c.contact_id
       WHERE c.user_id = ? ORDER BY u.username`,
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map(mapUser);
}

export function getOrCreateDm(userId: string, otherId: string): string {
  const row = getDb()
    .prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
       JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?
       WHERE c.type = 'dm'
       LIMIT 1`,
    )
    .get(userId, otherId) as { id: string } | undefined;
  if (row) return row.id;
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const database = getDb();
  database.prepare("INSERT INTO conversations (id, type, created_at) VALUES (?, 'dm', ?)").run(
    id,
    createdAt,
  );
  database
    .prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)")
    .run(id, userId);
  database
    .prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)")
    .run(id, otherId);
  return id;
}

export function getOrCreateSupport(userId: string): string {
  const admin = getAdmin();
  if (userId === admin.id) {
    const existing = getDb()
      .prepare(
        `SELECT c.id FROM conversations c
         JOIN conversation_members m ON m.conversation_id = c.id AND m.user_id = ?
         WHERE c.type = 'support'
         ORDER BY c.created_at DESC LIMIT 1`,
      )
      .get(admin.id) as { id: string } | undefined;
    if (existing) return existing.id;
  }
  const row = getDb()
    .prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
       WHERE c.type = 'support'
       LIMIT 1`,
    )
    .get(userId) as { id: string } | undefined;
  if (row) return row.id;
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO conversations (id, type, created_at) VALUES (?, 'support', ?)")
    .run(id, Date.now());
  getDb()
    .prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)")
    .run(id, userId);
  if (userId !== admin.id) {
    getDb()
      .prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)")
      .run(id, admin.id);
  }
  return id;
}

export function listConversations(userId: string): Conversation[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.type, c.created_at,
              (
                SELECT body FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) AS last_message,
              (
                SELECT created_at FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) AS last_at,
              (
                SELECT u.username FROM conversation_members cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.conversation_id = c.id AND cm.user_id != ?
                LIMIT 1
              ) AS other_username
       FROM conversations c
       JOIN conversation_members me ON me.conversation_id = c.id AND me.user_id = ?
       ORDER BY COALESCE(last_at, c.created_at) DESC`,
    )
    .all(userId, userId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type === "support" ? "support" : "dm",
    createdAt: Number(row.created_at),
    otherUsername: (row.other_username as string | null) ?? null,
    lastMessage: (row.last_message as string | null) ?? null,
    lastAt: row.last_at == null ? null : Number(row.last_at),
    title:
      row.type === "support"
        ? userId === getAdmin().id
          ? `@${row.other_username || "用户"} · 客服`
          : "客服"
        : `@${row.other_username || "未知"}`,
  }));
}

export function userInConversation(conversationId: string, userId: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
    )
    .get(conversationId, userId);
  return Boolean(row);
}

export function listMessages(conversationId: string): ChatMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT m.*, u.username AS sender_username
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
    )
    .all(conversationId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body),
    createdAt: Number(row.created_at),
    senderUsername: String(row.sender_username || ""),
  }));
}

export function sendMessage(conversationId: string, senderId: string, body: string): ChatMessage {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  getDb()
    .prepare(
      "INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, conversationId, senderId, body, createdAt);
  const sender = findUserById(senderId);
  return {
    id,
    conversationId,
    senderId,
    body,
    createdAt,
    senderUsername: sender?.username || "",
  };
}

export function plannedTreasuryNeed() {
  const people = Number(getSetting("planned_people", String(CIRCLE_SIZE))) || CIRCLE_SIZE;
  const float = Number(getSetting("per_person_float", String(PER_PERSON_FLOAT))) || PER_PERSON_FLOAT;
  return {
    plannedPeople: people,
    perPersonFloat: float,
    plannedTreasury: Math.round(people * float * (1 + TREASURY_BUFFER)),
  };
}

export function treasuryStats() {
  const admin = getAdmin();
  const users = listUsers().filter((u) => u.role !== "admin");
  const circulating = users.reduce((sum, u) => sum + u.balancePayme, 0);
  const plan = plannedTreasuryNeed();
  return {
    admin,
    userCount: users.length,
    circulating,
    treasuryPayme: admin.balancePayme,
    cnyReserve: Number(getSetting("cny_reserve", "0")),
    cnyPerPayme: Number(getSetting("cny_per_payme", "10")),
    plannedTreasury: plan.plannedTreasury,
    plannedPeople: plan.plannedPeople,
    perPersonFloat: plan.perPersonFloat,
  };
}

export function adminPayout(params: {
  username: string;
  amount: number;
  direction: "credit" | "debit";
  note?: string;
  fiatAmount?: number;
  fiatCurrency?: string;
}): Transaction {
  const admin = getAdmin();
  const other = findUserByUsername(params.username);
  if (!other) throw new Error(`找不到 @${params.username}`);
  if (other.id === admin.id) throw new Error("不能给金库自己调账");
  if (params.amount <= 0) throw new Error("金额必须大于 0");

  const fromUserId = params.direction === "credit" ? admin.id : other.id;
  const toUserId = params.direction === "credit" ? other.id : admin.id;
  const tx = transferPayme({
    fromUserId,
    toUserId,
    amount: params.amount,
    type: "adjust",
    note: params.note || (params.direction === "credit" ? "客服入账" : "客服兑出"),
    fiatAmount: params.fiatAmount,
    fiatCurrency: params.fiatCurrency,
  });
  if (params.fiatAmount && params.fiatCurrency?.toUpperCase() === "CNY") {
    adjustCnyReserve(params.direction === "credit" ? params.fiatAmount : -params.fiatAmount);
  }
  return tx;
}

function mapExchangeRequest(row: Record<string, unknown>): ExchangeRequest {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    conversationId: (row.conversation_id as string | null) ?? null,
    side: row.side === "sell" ? "sell" : "buy",
    amount: Number(row.amount),
    currency: String(row.currency),
    status: row.status === "filled" ? "filled" : row.status === "rejected" ? "rejected" : "pending",
    note: (row.note as string | null) ?? null,
    createdAt: Number(row.created_at),
    filledAt: row.filled_at == null ? null : Number(row.filled_at),
    username: (row.username as string | null) ?? undefined,
  };
}

export function createExchangeRequest(params: {
  userId: string;
  conversationId?: string;
  side: "buy" | "sell";
  amount: number;
  currency: string;
  note?: string;
}): ExchangeRequest {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO exchange_requests
       (id, user_id, conversation_id, side, amount, currency, status, note, created_at, filled_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`,
    )
    .run(
      id,
      params.userId,
      params.conversationId ?? null,
      params.side,
      params.amount,
      params.currency.toUpperCase(),
      params.note ?? null,
      createdAt,
    );
  return getExchangeRequest(id)!;
}

export function getExchangeRequest(id: string): ExchangeRequest | null {
  const row = getDb()
    .prepare(
      `SELECT r.*, u.username FROM exchange_requests r
       JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapExchangeRequest(row) : null;
}

export function listExchangeRequests(filter?: {
  status?: ExchangeRequest["status"];
  conversationId?: string;
}): ExchangeRequest[] {
  let sql = `SELECT r.*, u.username FROM exchange_requests r
             JOIN users u ON u.id = r.user_id`;
  const args: string[] = [];
  const where: string[] = [];
  if (filter?.status) {
    where.push("r.status = ?");
    args.push(filter.status);
  }
  if (filter?.conversationId) {
    where.push("r.conversation_id = ?");
    args.push(filter.conversationId);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY r.created_at DESC";
  const rows = getDb().prepare(sql).all(...args) as Record<string, unknown>[];
  return rows.map(mapExchangeRequest);
}

export function setExchangeRequestStatus(id: string, status: "filled" | "rejected") {
  getDb()
    .prepare("UPDATE exchange_requests SET status = ?, filled_at = ? WHERE id = ?")
    .run(status, Date.now(), id);
}

const BOOKING_SELECT = `
  SELECT b.*,
         COALESCE(u.first_name, u2.first_name) AS first_name,
         COALESCE(u.last_name, u2.last_name) AS last_name
  FROM exchange_bookings b
  LEFT JOIN users u ON u.id = b.user_id
  LEFT JOIN users u2 ON lower(u2.username) = lower(b.username)
`;

function mapBooking(row: Record<string, unknown>): ExchangeBooking {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    username: String(row.username),
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    slotDate: String(row.slot_date),
    slotTime: String(row.slot_time),
    side: row.side === "sell" ? "sell" : "buy",
    amount: Number(row.amount),
    currency: String(row.currency),
    status: row.status === "done" ? "done" : row.status === "cancelled" ? "cancelled" : "pending",
    note: (row.note as string | null) ?? null,
    createdAt: Number(row.created_at),
    createdBy: row.created_by === "admin" ? "admin" : "user",
  };
}

export function createBooking(params: {
  userId?: string | null;
  username: string;
  slotDate: string;
  slotTime: string;
  side: "buy" | "sell";
  amount: number;
  currency: string;
  note?: string;
  createdBy: "user" | "admin";
}): ExchangeBooking {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO exchange_bookings
       (id, user_id, username, slot_date, slot_time, side, amount, currency, status, note, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .run(
      id,
      params.userId ?? null,
      params.username.replace(/^@/, ""),
      params.slotDate,
      params.slotTime,
      params.side,
      params.amount,
      params.currency.toUpperCase(),
      params.note ?? null,
      createdAt,
      params.createdBy,
    );
  return getBooking(id)!;
}

export function getBooking(id: string): ExchangeBooking | null {
  const row = getDb()
    .prepare(`${BOOKING_SELECT} WHERE b.id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapBooking(row) : null;
}

export function listBookings(slotDate?: string): ExchangeBooking[] {
  const rows = (
    slotDate
      ? getDb()
          .prepare(`${BOOKING_SELECT} WHERE b.slot_date = ? ORDER BY b.slot_time ASC, b.created_at ASC`)
          .all(slotDate)
      : getDb()
          .prepare(`${BOOKING_SELECT} ORDER BY b.slot_date ASC, b.slot_time ASC`)
          .all()
  ) as Record<string, unknown>[];
  return rows.map(mapBooking);
}

export function bookingCountsByDate(): { date: string; people: number; pending: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT slot_date AS date, COUNT(*) AS people,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM exchange_bookings
       GROUP BY slot_date
       ORDER BY slot_date DESC
       LIMIT 30`,
    )
    .all() as { date: string; people: number; pending: number }[];
  return rows.map((r) => ({ date: r.date, people: Number(r.people), pending: Number(r.pending) }));
}

export function setBookingStatus(id: string, status: "done" | "cancelled" | "pending") {
  getDb().prepare("UPDATE exchange_bookings SET status = ? WHERE id = ?").run(status, id);
}
