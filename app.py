from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import uuid
import secrets
from detector import detect_issue
from database import init_db
from services.report_service import create_report, get_all_reports, update_status, delete_report
from services.auth_service import authenticate_user
from utils.gps_extractor import extract_gps
from functools import wraps

app = Flask(__name__)
# Generate a secret key if not set in ENV for Session signing
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(16))

# Configure Upload & Result folders
UPLOAD_FOLDER = os.path.join('static', 'uploads')
RESULT_FOLDER = os.path.join('static', 'results')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Initialize database
init_db()

# --- Decorators ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized. Admin privileges required.'}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Views ---
@app.route('/')
def home():
    """Redirects to the correct dashboard based on session state."""
    if 'user_id' in session:
        if session.get('role') == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('user_dashboard'))
    return redirect(url_for('login_page'))

@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'GET':
        return render_template('login.html')
    
    # Handle POST Auth
    username = request.form.get('username')
    password = request.form.get('password')
    
    user = authenticate_user(username, password)
    if user:
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        return redirect(url_for('home'))
        
    return render_template('login.html', error="Invalid credentials")

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))

@app.route('/dashboard')
@login_required
def user_dashboard():
    """Renders the standard User Dashboard (Read-Only feed, Detect capabilities)"""
    return render_template('dashboard.html', role=session.get('role'))

@app.route('/admin')
@login_required
def admin_dashboard():
    """Renders the Admin Panel (Full controls)"""
    if session.get('role') != 'admin':
        return redirect(url_for('user_dashboard'))
    return render_template('admin.html', role=session.get('role'))

# --- API Endpoints ---
@app.route('/detect', methods=['POST'])
@login_required
def run_detect():
    """Endpoint to handle image uploads and orchestration."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    filename = f"{uuid.uuid4()}_{file.filename}"
    upload_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(upload_path)

    # 1. Extract GPS
    lat, lon = extract_gps(upload_path)

    # 2. Run Inference
    detection_data = detect_issue(upload_path, RESULT_FOLDER)

    if detection_data["issue"]:
        # 3. Store Report
        report_id = create_report(
            issue=detection_data["issue"],
            confidence=detection_data["confidence"],
            image_path=detection_data["annotated_image_path"],
            latitude=lat,
            longitude=lon
        )
        
        return jsonify({
            'success': True,
            'report_id': report_id,
            'issue': detection_data["issue"],
            'confidence': detection_data["confidence"],
            'latitude': lat,
            'longitude': lon,
            'result_image_url': detection_data["annotated_image_path"]
        })
    else:
        return jsonify({
            'success': False,
            'message': 'No issue detected in the image.',
            'result_image_url': detection_data["annotated_image_path"]
        })

@app.route('/reports', methods=['GET'])
@login_required
def fetch_reports():
    """Returns all structured reports."""
    reports = get_all_reports()
    return jsonify(reports)

@app.route('/update_status', methods=['POST'])
@admin_required
def do_update_status():
    """Endpoint to progress issue lifecycles. Admin only."""
    data = request.json
    if not data or 'id' not in data or 'status' not in data:
        return jsonify({'error': 'Missing id or status'}), 400
        
    success = update_status(data['id'], data['status'])
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid status or ID not found'}), 400
    
@app.route('/delete_report', methods=['POST'])
@admin_required
def do_delete_report():
    """Endpoint to utterly destroy a civic report. Admin only."""
    data = request.json
    if not data or 'id' not in data:
        return jsonify({'error': 'Missing id'}), 400
        
    success = delete_report(data['id'])
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to delete report.'}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
