# Civic AI Reporter – AI Pothole Detection Dashboard

## 🏙️ Project Description
A modular web application (built on Flask) that detects **potholes** from user-uploaded images to help city authorities track and fix road damage. 

This project uses a custom-trained YOLOv8 object detection model (`best.pt`) that identifies potholes, draws bounding boxes, extracts exact GPS geolocation data from the photos, and plots the reported locations on an interactive Leaflet map without any page reloads.

## ✨ Features
- **Pothole Detection**: Uses a custom-trained YOLOv8 model for high-accuracy pothole detection.
- **GPS Extraction**: EXIF geolocation data is parsed directly from uploaded JPEGs utilizing a robust utility layer.
- **Live Issue Feed**: View an ascending list of mapped issues, right from the dashboard.
- **Issue Lifecycle Management**: Update the status of potholes directly from the feed (Pending, Verified, In Progress, Resolved).
- **Modern Dashboard UI**: A dark-mode inspired glassmorphism design with drag-and-drop file support.
- **SQLite Database**: Automatically logs every detection (ID, issue, confidence, GPS Coords, image hash, timestamp, and ticket status).

## 🛠️ Tech Stack & Modular Architecture
- **Presentation**: `app.py` coordinates HTTP requests.
- **Frontend Core**: HTML5, CSS3, Vanilla JS
- **AI Core**: YOLOv8 & OpenCV nested inside `detector.py`
- **Data & Services**: `database.py` wrapped by `services/report_service.py` to decouple business logic from API endpoints.
- **Utilities Layer**: `utils/gps_extractor.py` specifically configured to retrieve and format camera coordinates into numeric Lat/Lon tuples.

## 🚀 How to Run the App

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Flask Application**:
   ```bash
   python app.py
   ```

3. **Open the Dashboard**:
   Open your browser to `http://127.0.0.1:5000`

## 💡 Example Workflow
1. **Upload Image**: Drag your photo of road damage into the upload box or select manually.
2. **AI Detection**: Click "Detect Potholes". The UI triggers the backend which instantly rips the EXIF GPS metadata. YOLO runs synchronously.
3. **Database Logging**: The business logic Service intercepts the result bounding box and writes it to SQLite, marking the new Ticket as "Pending".
4. **Map Updated**: The popup marker appears instantly on the Leaflet map!
5. **Issue Triaged**: An Admin sees the ticket in the "Live Feed", selects the dropdown, and changes it to "Resolved". The service Layer saves it back to the DB seamlessly.
