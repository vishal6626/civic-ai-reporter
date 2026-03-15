import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = "reports.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Ensure Reports table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Safely apply Reports schema upgrades
    cursor.execute("PRAGMA table_info(reports)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "image_path" not in columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN image_path TEXT DEFAULT ''")
    
    if "latitude" not in columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN latitude REAL DEFAULT 13.0827")
        
    if "longitude" not in columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN longitude REAL DEFAULT 80.2707")
        
    if "status" not in columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN status TEXT DEFAULT 'Pending'")
        
    # 2. Ensure Users table exists for Phase 2 Auth
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    ''')
    
    # 3. Seed default admin if missing
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_hash = generate_password_hash("admin")
        cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ("admin", admin_hash, "admin"))
        
    # Seed default user if missing
    cursor.execute("SELECT * FROM users WHERE username = 'user'")
    if not cursor.fetchone():
        user_hash = generate_password_hash("user")
        cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ("user", user_hash, "user"))

    conn.commit()
    conn.close()

def get_connection():
    """Returns a raw SQLite connection object"""
    return sqlite3.connect(DB_PATH)
