import folium
from database import get_all_reports

def create_map():
    # Create a Folium map centered on Chennai (13.0827, 80.2707)
    m = folium.Map(location=[13.0827, 80.2707], zoom_start=12)

    # Fetch all reports from the database
    reports = get_all_reports()
    
    # Adding some slight offset for multiple reports to show them as separate pins
    # In a real app, GPS coordinates from image EXIF data would be used instead
    base_lat, base_lon = 13.0827, 80.2707
    
    for i, r in enumerate(reports):
        issue_name = r[1]
        conf = r[2]
        time_reported = r[3]
        
        # Fake coordinate offset based on ID just for visual prototype
        lat = base_lat + ((i % 10) * 0.005) - 0.02
        lon = base_lon + ((i // 10) * 0.005) - 0.01
        
        folium.Marker(
            [lat, lon],
            popup=f"<b>{issue_name.replace('_', ' ').title()}</b><br>Confidence: {conf:.2f}<br>{time_reported}",
            tooltip=f"{issue_name.replace('_', ' ').title()}",
            icon=folium.Icon(color="red", icon="info-sign")
        ).add_to(m)

    return m
