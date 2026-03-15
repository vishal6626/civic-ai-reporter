from werkzeug.security import check_password_hash
from database import get_connection
import sqlite3  

def authenticate_user(username, password):
    """
    Checks credentials against the SQLite users table.
    Returns: a dict {'id', 'username', 'role'} on success, None on failure.
    """
    conn = get_connection()
    # Return rows as dicts
    conn.row_factory = sqlite3.Row if hasattr(sqlite3, 'Row') else None
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (username,))
    user_row = cursor.fetchone()
    conn.close()
    
    if user_row:
        # Check password
        hashed_pw = user_row[2] if type(user_row) is tuple else user_row['password_hash']
        if check_password_hash(hashed_pw, password):
            return {
                'id': user_row[0] if type(user_row) is tuple else user_row['id'],
                'username': user_row[1] if type(user_row) is tuple else user_row['username'],
                'role': user_row[3] if type(user_row) is tuple else user_row['role']
            }
            
    return None
