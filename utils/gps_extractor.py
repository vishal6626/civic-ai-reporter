from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_decimal_from_dms(dms, ref):
    """Converts Degrees, Minutes, Seconds formatting into strict Decimal coordinates"""
    degrees = dms[0]
    minutes = dms[1] / 60.0
    seconds = dms[2] / 3600.0

    if ref in ['S', 'W']:
        return -(degrees + minutes + seconds)
    return degrees + minutes + seconds

def extract_gps(image_path):
    """
    Extracts GPS metadata from an image.
    Returns: (latitude, longitude)
    If no metadata is found, defaults to Chennai coordinates: (13.0827, 80.2707)
    """
    default_coords = (13.0827, 80.2707)
    
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        
        if not exif_data:
            return default_coords
            
        # Parse standard tags until we find GPSInfo
        for tag, value in exif_data.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                gps_data = {}
                for t in value:
                    sub_decoded = GPSTAGS.get(t, t)
                    gps_data[sub_decoded] = value[t]
                    
                if "GPSLatitude" in gps_data and "GPSLongitude" in gps_data:
                    lat = get_decimal_from_dms(gps_data['GPSLatitude'], gps_data['GPSLatitudeRef'])
                    lon = get_decimal_from_dms(gps_data['GPSLongitude'], gps_data['GPSLongitudeRef'])
                    return (lat, lon)
                    
        return default_coords
        
    except Exception as e:
        print(f"Warning: GPS Extraction failed: {e}")
        return default_coords
