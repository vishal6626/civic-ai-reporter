import os
import cv2
from ultralytics import YOLO

# Load the custom YOLOv8 model
model = YOLO('models/best.pt')

def detect_issue(image_path, save_dir):
    """
    Runs custom YOLOv8 inference.
    Returns structured dict: { "issue": str, "confidence": float, "annotated_image_path": str }
    """
    if not os.path.exists(image_path):
        return {"issue": None, "confidence": 0.0, "annotated_image_path": None}

    # Run inference on the image
    results = model(image_path)
    
    highest_conf = 0.0
    detected_issue = None
    annotated_image = None

    if len(results) > 0:
        result = results[0]
        annotated_image = result.plot()
        
        boxes = result.boxes
        if boxes is not None:
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model.names[cls_id]

                if conf > highest_conf:
                    highest_conf = conf
                    detected_issue = class_name

    if detected_issue is None and annotated_image is None:
         annotated_image = cv2.imread(image_path)

    base_name = os.path.basename(image_path)
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, base_name)
    
    if annotated_image is not None:
        cv2.imwrite(save_path, annotated_image)
    
    # Return structured dict per requirements
    return {
        "issue": detected_issue,
        "confidence": highest_conf,
        "annotated_image_path": f"/static/results/{base_name}" if detected_issue else None
    }
