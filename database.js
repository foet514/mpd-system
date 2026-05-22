import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcryptjs from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'mpd_system.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          badge_number TEXT UNIQUE,
          role_id TEXT NOT NULL,
          division_id TEXT,
          unit_id TEXT,
          rank_id TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (role_id) REFERENCES roles(id),
          FOREIGN KEY (rank_id) REFERENCES ranks(id),
          FOREIGN KEY (division_id) REFERENCES divisions(id),
          FOREIGN KEY (unit_id) REFERENCES units(id)
        )
      `);

      // Roles table
      db.run(`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          role_name TEXT UNIQUE NOT NULL,
          description TEXT,
          access_level TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ranks table
      db.run(`
        CREATE TABLE IF NOT EXISTS ranks (
          id TEXT PRIMARY KEY,
          rank_name TEXT UNIQUE NOT NULL,
          rank_order INTEGER UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Divisions table
      db.run(`
        CREATE TABLE IF NOT EXISTS divisions (
          id TEXT PRIMARY KEY,
          division_name TEXT UNIQUE NOT NULL,
          description TEXT,
          parent_division_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_division_id) REFERENCES divisions(id)
        )
      `);

      // Units table
      db.run(`
        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          unit_name TEXT UNIQUE NOT NULL,
          division_id TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (division_id) REFERENCES divisions(id)
        )
      `);

      // Clock-in/out records
      db.run(`
        CREATE TABLE IF NOT EXISTS clock_records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          clock_in_time DATETIME,
          clock_out_time DATETIME,
          pause_time DATETIME,
          resume_time DATETIME,
          total_minutes INTEGER DEFAULT 0,
          shift_voided BOOLEAN DEFAULT 0,
          edited_by TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (edited_by) REFERENCES users(id)
        )
      `);

      // Announcements table
      db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          author_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `);

      // Warrants table
      db.run(`
        CREATE TABLE IF NOT EXISTS warrants (
          id TEXT PRIMARY KEY,
          warrant_number TEXT UNIQUE NOT NULL,
          suspect_name TEXT NOT NULL,
          warrant_type TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          issued_by TEXT NOT NULL,
          issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          executed_date DATETIME,
          FOREIGN KEY (issued_by) REFERENCES users(id)
        )
      `);

      // Warrant requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS warrant_requests (
          id TEXT PRIMARY KEY,
          warrant_id TEXT,
          requester_id TEXT NOT NULL,
          suspect_name TEXT NOT NULL,
          warrant_type TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          requested_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_by TEXT,
          approved_date DATETIME,
          notes TEXT,
          FOREIGN KEY (warrant_id) REFERENCES warrants(id),
          FOREIGN KEY (requester_id) REFERENCES users(id),
          FOREIGN KEY (approved_by) REFERENCES users(id)
        )
      `);

      // Event logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS event_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          description TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Administrator logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id TEXT PRIMARY KEY,
          admin_id TEXT NOT NULL,
          action TEXT NOT NULL,
          target_user_id TEXT,
          description TEXT,
          changes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES users(id),
          FOREIGN KEY (target_user_id) REFERENCES users(id)
        )
      `);

      // Oversight logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS oversight_logs (
          id TEXT PRIMARY KEY,
          overseer_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (overseer_id) REFERENCES users(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Kill site reports table
      db.run(`
        CREATE TABLE IF NOT EXISTS kill_sites (
          id TEXT PRIMARY KEY,
          location TEXT NOT NULL,
          date_reported DATETIME DEFAULT CURRENT_TIMESTAMP,
          reported_by TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          FOREIGN KEY (reported_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err) reject(err);
        else {
          seedDatabase().then(resolve).catch(reject);
        }
      });
    });
  });
}

// Seed database with initial data
async function seedDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if data already exists
      db.get("SELECT COUNT(*) as count FROM roles", async (err, row) => {
        if (err) reject(err);
        
        if (row.count === 0) {
          try {
            // Seed ranks
            const ranks = [
              { id: 'rank_1', name: 'Chief of Police', order: 1 },
              { id: 'rank_2', name: 'Deputy Chief of Police', order: 2 },
              { id: 'rank_3', name: 'Police Administrator', order: 3 },
              { id: 'rank_4', name: 'Police Commander', order: 4 },
              { id: 'rank_5', name: 'Deputy Police Commander', order: 5 },
              { id: 'rank_6', name: 'Police Inspector', order: 6 },
              { id: 'rank_7', name: 'Captain', order: 7 },
              { id: 'rank_8', name: 'Lieutenant', order: 8 },
              { id: 'rank_9', name: 'Staff Sergeant', order: 9 },
              { id: 'rank_10', name: 'Sergeant', order: 10 },
              { id: 'rank_11', name: 'Officer', order: 11 }
            ];

            for (const rank of ranks) {
              db.run(
                `INSERT INTO ranks (id, rank_name, rank_order) VALUES (?, ?, ?)`,
                [rank.id, rank.name, rank.order]
              );
            }

            // Seed roles
            const roles = [
              { id: 'role_admin', name: 'Administrator', level: 'full' },
              { id: 'role_mpd_hq', name: 'MPD HQ', level: 'full' },
              { id: 'role_high_comm', name: 'High Command', level: 'full' },
              { id: 'role_unit_cmd', name: 'Unit Command', level: 'full' },
              { id: 'role_unit_staff', name: 'Unit Staff', level: 'limited' },
              { id: 'role_employee', name: 'Employee', level: 'limited' }
            ];

            for (const role of roles) {
              db.run(
                `INSERT INTO roles (id, role_name, description, access_level) VALUES (?, ?, ?, ?)`,
                [role.id, role.name, role.name + ' Access', role.level]
              );
            }

            // Seed divisions
            const divisions = [
              { id: 'div_patrol', name: 'Patrol Services Division', parent: null },
              { id: 'div_patrol_north', name: 'Patrol Services of the North', parent: 'div_patrol' },
              { id: 'div_patrol_south', name: 'Patrol Services of the South', parent: 'div_patrol' },
              { id: 'div_academy', name: 'MPD Academy', parent: null },
              { id: 'div_academy_training', name: 'Office of Integrated Training', parent: 'div_academy' },
              { id: 'div_academy_leadership', name: 'Office of Leadership and Management', parent: 'div_academy' },
              { id: 'div_investigation', name: 'Investigation Office Division', parent: null },
              { id: 'div_investigation_unit', name: 'Investigation Unit', parent: 'div_investigation' },
              { id: 'div_investigation_turnover', name: 'Turnover Affairs Bureau', parent: 'div_investigation' }
            ];

            for (const div of divisions) {
              db.run(
                `INSERT INTO divisions (id, division_name, description, parent_division_id) VALUES (?, ?, ?, ?)`,
                [div.id, div.name, div.name, div.parent]
              );
            }

            // Create admin user
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash('Khamod21', salt);

            db.run(
              `INSERT INTO users (id, username, password, email, first_name, last_name, badge_number, role_id, rank_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'user_admin',
                'foet514',
                hashedPassword,
                'admin@mpd.gov',
                'System',
                'Administrator',
                'ADMIN001',
                'role_admin',
                'rank_1'
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          } catch (error) {
            reject(error);
          }
        } else {
          resolve();
        }
      });
    });
  });
}

export function getDatabase() {
  return db;
}

export function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
