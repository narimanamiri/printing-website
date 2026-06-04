import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'printing-shop.db');

let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();
  
  // Create orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      filename TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      weight REAL NOT NULL,
      cost INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_payment_intent TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_confirmed_at DATETIME,
      completed_at DATETIME,
      notes TEXT
    )
  `);

  // Create indices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_uploaded_at ON orders(uploaded_at DESC);
  `);
}

export interface Order {
  id: string;
  email: string;
  filename: string;
  filesize: number;
  weight: number;
  cost: number;
  status: 'pending' | 'paid' | 'confirmed' | 'printing' | 'completed';
  stripe_payment_intent: string | null;
  uploaded_at: string;
  payment_confirmed_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export function createOrder(data: Omit<Order, 'id' | 'uploaded_at'>): Order {
  const db = getDb();
  const id = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const stmt = db.prepare(`
    INSERT INTO orders (id, email, filename, filesize, weight, cost, status, stripe_payment_intent, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    data.email,
    data.filename,
    data.filesize,
    data.weight,
    data.cost,
    data.status,
    data.stripe_payment_intent || null,
    data.notes || null
  );
  
  const order = getOrder(id);
  return order!;
}

export function getOrder(id: string): Order | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return stmt.get(id) as Order | null;
}

export function getOrdersByEmail(email: string): Order[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM orders WHERE email = ? ORDER BY uploaded_at DESC');
  return stmt.all(email) as Order[];
}

export function getOrdersByStatus(status: string): Order[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY uploaded_at DESC');
  return stmt.all(status) as Order[];
}

export function updateOrderStatus(id: string, status: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

export function confirmPayment(id: string, paymentIntentId: string): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE orders SET status = ?, stripe_payment_intent = ?, payment_confirmed_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  stmt.run('paid', paymentIntentId, id);
}

export function confirmOrder(id: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run('confirmed', id);
}

export function getAllOrders(): Order[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM orders ORDER BY uploaded_at DESC');
  return stmt.all() as Order[];
}
