const Jimp = require('jimp');
const fs = require('fs');

async function removeBackground(file) {
    if (!fs.existsSync(file)) return;
    const image = await Jimp.read(file);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const red   = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue  = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];

        // Calculate differences between channels to ensure it's a neutral color (grey/white)
        const maxDiff = Math.max(Math.abs(red - green), Math.abs(green - blue), Math.abs(red - blue));
        
        // If the color is very light (R,G,B > 180) and low saturation (maxDiff < 20), it's the checkerboard
        if (red > 180 && green > 180 && blue > 180 && maxDiff < 25) {
            this.bitmap.data[idx + 3] = 0; // Set alpha to 0
        }
    });

    await image.writeAsync(file);
    console.log("Processed:", file);
}

const files = [
    'public/assets/federica.png',
    'public/assets/marialaura.png',
    'public/assets/oscurato.png',
    'public/assets/pierluigi.png',
    'public/assets/ciccio.png',
    'public/assets/gaspare.png',
    'public/assets/ladro.png'
];

async function run() {
    for (const f of files) {
        await removeBackground(f);
    }
}

run();
