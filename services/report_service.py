from database import get_connection
from datetime import datetime
import sqlite3

SEVERITY_WEIGHTS = {
    'pothole': 5,
    'broken_signage': 4,
    'construction_road': 3,
    'garbage': 2,
    'graffiti': 1
}

def calculate_priority(issue, confidence, timestamp_str):
    try:
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        age_hours = (datetime.now() - dt).total_seconds() / 3600.0
    except ValueError:
        age_hours = 0
        
    weight = SEVERITY_WEIGHTS.get(issue.lower(), 1)
    score = (weight * 2) + (confidence * 5) + (age_hours / 12)
    return round(score, 2)

def create_report(issue, confidence, image_path, latitude, longitude):
    """Inserts a new report into the database"""
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "Pending"
    
    cursor.execute('''
        INSERT INTO reports (issue, confidence, timestamp, image_path, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (issue, confidence, timestamp, image_path, latitude, longitude, status))
    
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return report_id

def get_all_reports():
    """Fetches all reports from the database"""
    conn = get_connection()
    # Map row into dictionary
    conn.row_factory = sqlite3.Row if hasattr(sqlite3, 'Row') else None 
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY id ASC")
    
    # Standard fallback if row_factory isn't used
    rows = cursor.fetchall()
    
    reports_list = []
    for r in rows:
        conf = r[2]
        ts = r[3]
        issue_type = r[1]
        priority = calculate_priority(issue_type, conf, ts)
        
        reports_list.append({
            'id': r[0],
            'issue': issue_type,
            'confidence': conf,
            'timestamp': ts,
            'image_path': r[4] if len(r) > 4 else '',
            'latitude': r[5] if len(r) > 5 else 13.0827,
            'longitude': r[6] if len(r) > 6 else 80.2707,
            'status': r[7] if len(r) > 7 else 'Pending',
            'priority_score': priority
        })
        
    conn.close()
    return reports_list

def update_status(report_id, new_status):
    """Updates the lifecycle status of a specific report"""
    valid_statuses = ["Pending", "Verified", "In Progress", "Resolved"]
    if new_status not in valid_statuses:
        return False
        
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE reports 
        SET status = ? 
        WHERE id = ?
    ''', (new_status, report_id))
    
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return rows_affected > 0

def delete_report(report_id):
    """Hard-deletes a report from the database"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    return rows_affected > 0
