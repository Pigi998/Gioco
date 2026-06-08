from PIL import Image
import os

def remove_checkerboard(image_path):
    if not os.path.exists(image_path):
        print(f"Not found: {image_path}")
        return
        
    print(f"Cleaning {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        # Checkerboard is usually grey/white. If R,G,B > 180 and it's roughly greyscale
        if r > 180 and g > 180 and b > 180 and max(abs(r-g), abs(g-b), abs(r-b)) < 20:
            new_data.append((255, 255, 255, 0))
        # Also remove pure white just in case
        elif r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(image_path, "PNG")
    print(f"Done cleaning {image_path}")

remove_checkerboard("public/assets/federica.png")
