import os
from rembg import remove
from PIL import Image

def process_images():
    assets_dir = "public/assets"
    
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
        input_path = os.path.join(assets_dir, char)
        if os.path.exists(input_path):
            print(f"Processing {char}...")
            try:
                input_image = Image.open(input_path)
                output_image = remove(input_image)
                output_image.save(input_path)
                print(f"Successfully processed {char}")
            except Exception as e:
                print(f"Error processing {char}: {e}")

if __name__ == "__main__":
    process_images()
