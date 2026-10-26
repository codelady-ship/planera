// Generates the PWA icons in public/icons from the brand mark (#54).
// Run from frontend/: node scripts/pwa-icons.mjs
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const SOURCE = 'public/brand/randevum-mark.png'
const OUT = 'public/icons'
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(OUT, { recursive: true })

// The mark is a white square with the clock-R in the middle; it is already a
// fine "any" icon, so those are plain resizes.
for (const size of [192, 512]) {
  await sharp(SOURCE).resize(size, size).png().toFile(`${OUT}/icon-${size}.png`)
}

// Maskable icons are cropped to a circle (or other shape) by Android, so the
// drawing must stay inside the central 80% safe zone: the trimmed mark is
// scaled to 55% of the canvas height and centered on a white background.
const trimmed = await sharp(SOURCE).trim({ threshold: 20 }).toBuffer()
for (const size of [192, 512]) {
  const content = await sharp(trimmed)
    .resize({ height: Math.round(size * 0.55), fit: 'inside' })
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: content, gravity: 'centre' }])
    .png()
    .toFile(`${OUT}/icon-maskable-${size}.png`)
}

console.log('Icons written to', OUT)
