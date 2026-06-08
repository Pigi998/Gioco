from PIL import Image
import os

def remove_background(image_path):
    if not os.path.exists(image_path):
        return
        
    print(f"Processing {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        # If pixel is near white (R,G,B > 240), make transparent
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0))
        # If pixel is the AI checkerboard (light grey, R≈G≈B > 180)
        elif r > 180 and g > 180 and b > 180 and max(abs(r-g), abs(g-b), abs(r-b)) < 25:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(image_path, "PNG")
    print(f"Done processing {image_path}")

characters = [
    "federica.png",
    "marialaura.png",
    "oscurato.png",
    "pierluigi.png",
    "ciccio.png",
    "gaspare.png",
    "ladro.png"
]

for char in characters:
    remove_background(os.path.join("public/assets", char))
