import cv2
import numpy as np

def remove_checkerboard(input_path, output_path):
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Image not found")
        return
        
    # If image has no alpha, add it
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    # The checkerboard is usually near-white and near-grey.
    # Let's create a mask for pixels where R, G, B are all > 180 and max_diff(R,G,B) < 20 (meaning they are light grey/white)
    
    b, g, r, a = cv2.split(img)
    
    # Calculate difference between color channels
    diff_bg = cv2.absdiff(b, g)
    diff_gr = cv2.absdiff(g, r)
    diff_br = cv2.absdiff(b, r)
    
    max_diff = cv2.max(cv2.max(diff_bg, diff_gr), diff_br)
    
    # Mask condition: Light colors (all > 150) and low saturation (max_diff < 30)
    mask = (b > 150) & (g > 150) & (r > 150) & (max_diff < 30)
    
    # Apply transparency
    a[mask] = 0
    
    # Re-merge
    img = cv2.merge((b, g, r, a))
    
    cv2.imwrite(output_path, img)
    print("Done")

remove_checkerboard("public/assets/federica.png", "public/assets/federica.png")
