import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'
import { generateCardNumber } from '../../utils/cardnumber'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  balance INTEGER NOT NULL DEFAULT 67,
  xp REAL NOT NULL DEFAULT 0,
  lastCheckin INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS card (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'tier1',
  number TEXT,
  last4 TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  balance INTEGER NOT NULL DEFAULT 0,
  mutations INTEGER NOT NULL DEFAULT 0,
  mutationLog TEXT NOT NULL DEFAULT '[]',
  behavior TEXT NOT NULL DEFAULT 'normal',
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  token TEXT NOT NULL UNIQUE,
  expiresAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  name TEXT NOT NULL,
  desc TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0',
  type TEXT NOT NULL DEFAULT 'action',
  code TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 0,
  isPublic INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_data (
  id TEXT PRIMARY KEY,
  pluginId TEXT NOT NULL REFERENCES plugin(id),
  userId TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  UNIQUE(pluginId, key)
);

CREATE TABLE IF NOT EXISTS money_ledger (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  pluginId TEXT,
  fromUserId TEXT,
  toUserId TEXT,
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'done',
  createdAt INTEGER NOT NULL
);
`

const DB_PATH = process.env.DB_PATH ?? (process.env.AMVERA === '1' ? '/data/mannru.db' : resolve(process.cwd(), '.data', 'mannru.db'))

mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.exec(SCHEMA)

/* миграции: колонка icon появилась позже */
try {
  db.exec('ALTER TABLE plugin ADD COLUMN icon TEXT NOT NULL DEFAULT \'\'')
} catch {
  /* колонка уже существует */
}

try {
  db.exec('ALTER TABLE user ADD COLUMN xp REAL NOT NULL DEFAULT 0')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE user ADD COLUMN lastCheckin INTEGER')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE user ADD COLUMN creepto REAL NOT NULL DEFAULT 0')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE user ADD COLUMN clickPower INTEGER NOT NULL DEFAULT 1')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN tier TEXT NOT NULL DEFAULT \'tier1\'')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN number TEXT')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN balance INTEGER NOT NULL DEFAULT 0')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN mutations INTEGER NOT NULL DEFAULT 0')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN mutationLog TEXT NOT NULL DEFAULT \'[]\'')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE card ADD COLUMN behavior TEXT NOT NULL DEFAULT \'normal\'')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE plugin ADD COLUMN type TEXT NOT NULL DEFAULT \'action\'')
} catch {
  /* column already exists */
}

try {
  db.exec('ALTER TABLE plugin ADD COLUMN isPublic INTEGER NOT NULL DEFAULT 0')
} catch {
  /* column already exists */
}

{
  const rows = db.prepare('SELECT id, tier FROM card WHERE number IS NULL').all() as { id: string, tier: string }[]
  for (const row of rows) {
    const tierLevel = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'].indexOf(row.tier) + 1
    const number = generateCardNumber(tierLevel)
    db.prepare('UPDATE card SET number = ?, last4 = ? WHERE id = ?').run(number, number.slice(-4), row.id)
  }
}

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    /* доступ через любые хосты (туннели, прокси) — CSRF-проверка отключена */
    disableCSRFCheck: true
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://192.168.*.*:*',
    'http://10.*.*.*:*'
  ],
  emailAndPassword: {
    enabled: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7
  },
  user: {
    additionalFields: {
      balance: {
        type: 'number',
        required: false,
        defaultValue: 67,
        input: false
      },
      xp: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false
      },
      lastCheckin: {
        type: 'number',
        required: false,
        input: false
      },
      creepto: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false
      },
      clickPower: {
        type: 'number',
        required: false,
        defaultValue: 1,
        input: false
      }
    }
  }
})

export { db }
