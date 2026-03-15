// Core UI script (Maps and Upload handlers used across views)

let map;
let markerGroup;
let selectedFile = null;

// Helper to color map pins
function getMarkerColor(status) {
    if (status === "Resolved") return "green";
    if (status === "Verified") return "orange";
    if (status === "In Progress") return "blue";
    return "red"; // Pending
}

// Helper for Severity Weight
function getSeverityWeight(issue) {
    const weights = {
        'pothole': 5,
        'broken_signage': 4,
        'construction_road': 3,
        'garbage': 2,
        'graffiti': 1
    };
    return weights[issue.toLowerCase()] || 1;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Leaflet Map over Chennai (if map container exists)
    if(document.getElementById('map')) {
        map = L.map('map').setView([13.0827, 80.2707], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        
        markerGroup = L.layerGroup().addTo(map);
    }
    
    // Load initial reports to populate map, stats, and fire feed callbacks
    fetchReports();

    // 2. File Upload UI logic (Only run if elements exist on page)
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const detectBtn = document.getElementById('detect-btn');

    if (dropZone) {
        // Drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if(e.dataTransfer.files.length > 0){
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if(fileInput.files.length > 0){
                handleFileSelection(fileInput.files[0]);
            }
        });

        function handleFileSelection(file) {
            if (!file.type.match('image.*')) {
                alert("Please upload an image file (jpg, png).");
                return;
            }
            selectedFile = file;
            
            // Show local preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                dropZone.classList.add('hidden');
                previewContainer.classList.remove('hidden');
                resetResultPanel();
            };
            reader.readAsDataURL(file);
        }

        // 3. Submit and Process API Call
        detectBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            // UI Reset
            document.getElementById('empty-state').classList.add('hidden');
            document.getElementById('result-content').classList.add('hidden');
            document.getElementById('loading').classList.remove('hidden');
            detectBtn.disabled = true;

            const formData = new FormData();
            formData.append('image', selectedFile);

            try {
                const response = await fetch('/detect', {
                    method: 'POST',
                    body: formData
                });
                
                // Catch redirect edges if session expired
                if(response.redirected) {
                    window.location.href = response.url;
                    return;
                }
                
                const data = await response.json();
                
                // Re-enable button
                detectBtn.disabled = false;
                document.getElementById('loading').classList.add('hidden');
                
                if (data.success) {
                    // Show success UI
                    const resultContent = document.getElementById('result-content');
                    const badge = document.getElementById('issue-badge');
                    
                    badge.className = 'badge success';
                    badge.innerText = `Detected: ${data.issue.replace('_', ' ').toUpperCase()}`;
                    
                    document.getElementById('conf-text').innerHTML = `Confidence: <b>${data.confidence.toFixed(2)}</b><br><small>GPS: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}</small>`;
                    document.getElementById('result-image').src = data.result_image_url;
                    
                    resultContent.classList.remove('hidden');

                    // Re-fetch reports to update DB/Map/Feed
                    fetchReports();

                } else {
                    // Show warning UI
                    const resultContent = document.getElementById('result-content');
                    const badge = document.getElementById('issue-badge');
                    
                    badge.className = 'badge warning';
                    badge.innerText = data.error || data.message || "No issues detected";
                    
                    document.getElementById('conf-text').innerText = "";
                    
                    if (data.result_image_url) {
                        document.getElementById('result-image').src = data.result_image_url;
                    }
                    
                    resultContent.classList.remove('hidden');
                }

            } catch (error) {
                console.error("Detection error:", error);
                alert("An error occurred during detection.");
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('empty-state').classList.remove('hidden');
                detectBtn.disabled = false;
            }
        });

        function resetResultPanel() {
            document.getElementById('empty-state').classList.remove('hidden');
            document.getElementById('result-content').classList.add('hidden');
            document.getElementById('issue-badge').className = 'badge';
        }
    }
});

// 4. Fetch Stats, Map Markers, and trigger Dashboard callbacks
async function fetchReports() {
    try {
        const response = await fetch('/reports');
        if(response.redirected) {
            window.location.href = response.url;
            return;
        }
        
        const reports = await response.json();
        
        // Update Stats (if elements exist, e.g. on Dashboard)
        const totalHtml = document.getElementById('total-reports-val');
        const avgHtml = document.getElementById('avg-conf-val');
        
        if (totalHtml && avgHtml) {
            if (reports && reports.length > 0) {
                totalHtml.innerText = reports.length;
                const sum = reports.reduce((acc, r) => acc + r.confidence, 0);
                avgHtml.innerText = (sum / reports.length).toFixed(2);
            } else {
                totalHtml.innerText = "0";
                avgHtml.innerText = "0.00";
            }
        }

        // Update Map Markers 
        if (markerGroup) {
            markerGroup.clearLayers();
            reports.forEach((r) => {
                const color = getMarkerColor(r.status);
                
                // A neat trick to color standard leaflet markers without extra imagery
                const icon = new L.Icon({
                  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                });
                
                const sevWeight = getSeverityWeight(r.issue);
                const tooltipText = `<b>${r.issue.replace('_', ' ').toUpperCase()}</b><br>Status: ${r.status}<br>Severity: ${sevWeight}<br>Priority Score: ${r.priority_score}<br>Confidence: ${r.confidence.toFixed(2)}<br>ID: ${r.id}<br><a href="#" onclick="if(window.scrollToTicket) { window.scrollToTicket(${r.id}); } return false;" style="color: #38bdf8; text-decoration: none; margin-top: 6px; display: inline-block; font-weight: 600;">Scroll to Report</a>`;
                L.marker([r.latitude, r.longitude], {icon: icon})
                    .addTo(markerGroup)
                    .bindPopup(tooltipText)
                    .bindTooltip(r.issue);
            });
            
            if(reports.length > 0) {
                 map.setView([reports[reports.length-1].latitude, reports[reports.length-1].longitude], 13);
            }
        }
        
        // Hand off to the specific page logic (dashboard.js, etc.)
        if (window.fetchReportsCallback) {
            window.fetchReportsCallback(reports);
        }

    } catch (error) {
        console.error("Failed to fetch reports:", error);
    }
}
