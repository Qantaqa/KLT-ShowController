/**
 * Generate a simple SMPTE-style test pattern as a BMP file.
 * No external dependencies needed.
 */
const fs = require('fs');
const path = require('path');

const WIDTH = 1920;
const HEIGHT = 1080;
const BYTES_PER_PIXEL = 3;
const ROW_SIZE = Math.ceil(WIDTH * BYTES_PER_PIXEL / 4) * 4; // BMP rows must be 4-byte aligned
const PIXEL_DATA_SIZE = ROW_SIZE * HEIGHT;
const FILE_SIZE = 54 + PIXEL_DATA_SIZE;

// SMPTE color bars (BGR format for BMP)
const COLORS = [
    [255, 255, 255], // White
    [0, 255, 255],   // Yellow (BGR)
    [255, 255, 0],   // Cyan (BGR)
    [0, 255, 0],     // Green
    [255, 0, 255],   // Magenta (BGR)
    [0, 0, 255],     // Red (BGR)
    [255, 0, 0],     // Blue (BGR)
    [0, 0, 0],       // Black
];

// Create BMP header
const buf = Buffer.alloc(FILE_SIZE);

// BMP File Header (14 bytes)
buf.write('BM', 0);                    // Signature
buf.writeUInt32LE(FILE_SIZE, 2);       // File size
buf.writeUInt32LE(0, 6);              // Reserved
buf.writeUInt32LE(54, 10);            // Pixel data offset

// DIB Header (40 bytes - BITMAPINFOHEADER)
buf.writeUInt32LE(40, 14);            // Header size
buf.writeInt32LE(WIDTH, 18);          // Width
buf.writeInt32LE(HEIGHT, 22);         // Height (positive = bottom-up)
buf.writeUInt16LE(1, 26);             // Color planes
buf.writeUInt16LE(24, 28);            // Bits per pixel
buf.writeUInt32LE(0, 30);             // Compression (none)
buf.writeUInt32LE(PIXEL_DATA_SIZE, 34); // Image size
buf.writeInt32LE(3780, 38);           // X pixels per meter
buf.writeInt32LE(3780, 42);           // Y pixels per meter
buf.writeUInt32LE(0, 46);             // Colors in table
buf.writeUInt32LE(0, 50);             // Important colors

// Draw pixel data (bottom-up in BMP format)
const barWidth = Math.floor(WIDTH / COLORS.length);

for (let y = 0; y < HEIGHT; y++) {
    // BMP is bottom-up, so row 0 in buffer = bottom of image
    const actualY = HEIGHT - 1 - y;
    const rowOffset = 54 + actualY * ROW_SIZE;

    for (let x = 0; x < WIDTH; x++) {
        const pixelOffset = rowOffset + x * BYTES_PER_PIXEL;

        // Top 70% = color bars
        if (y < HEIGHT * 0.7) {
            const barIndex = Math.min(Math.floor(x / barWidth), COLORS.length - 1);
            const color = COLORS[barIndex];
            buf[pixelOffset] = color[0];     // Blue
            buf[pixelOffset + 1] = color[1]; // Green
            buf[pixelOffset + 2] = color[2]; // Red
        }
        // Middle 10% = reverse mini bars
        else if (y < HEIGHT * 0.8) {
            const barIndex = Math.min(Math.floor(x / barWidth), COLORS.length - 1);
            const revIndex = COLORS.length - 1 - barIndex;
            const color = COLORS[revIndex];
            buf[pixelOffset] = color[0];
            buf[pixelOffset + 1] = color[1];
            buf[pixelOffset + 2] = color[2];
        }
        // Bottom 20% = gradient (black to white)
        else {
            const val = Math.floor((x / WIDTH) * 255);
            buf[pixelOffset] = val;
            buf[pixelOffset + 1] = val;
            buf[pixelOffset + 2] = val;
        }

        // Draw border
        if (x < 3 || x >= WIDTH - 3 || y < 3 || y >= HEIGHT - 3) {
            buf[pixelOffset] = 255;
            buf[pixelOffset + 1] = 255;
            buf[pixelOffset + 2] = 255;
        }

        // Draw crosshair
        const cx = Math.floor(WIDTH / 2);
        const cy = Math.floor(HEIGHT / 2);
        if ((Math.abs(x - cx) < 2 && y > cy - 100 && y < cy + 100) ||
            (Math.abs(y - cy) < 2 && x > cx - 100 && x < cx + 100)) {
            buf[pixelOffset] = 255;
            buf[pixelOffset + 1] = 255;
            buf[pixelOffset + 2] = 255;
        }
    }
}

const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
}

const outputPath = path.join(mediaDir, 'test-pattern.bmp');
fs.writeFileSync(outputPath, buf);
console.log(`Test pattern generated: ${outputPath} (${(FILE_SIZE / 1024 / 1024).toFixed(1)} MB)`);
