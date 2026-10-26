// Generates the Android and iOS launcher icons and splash images from the
// brand mark (#64). Run from frontend/ after `npx cap add android|ios`:
//   node scripts/mobile-assets.mjs
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const MARK = 'public/brand/randevum-mark.png'
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const NAVY = { r: 7, g: 41, b: 104, alpha: 1 }

/** The mark drawn at `scale` of the canvas height, centered on `background`. */
async function framed(size, scale, background) {
  const trimmed = await sharp(MARK).trim({ threshold: 20 }).toBuffer()
  const content = await sharp(trimmed)
    .resize({ height: Math.round(size * scale), fit: 'inside' })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: content, gravity: 'centre' }])
    .png()
    .toBuffer()
}

/** White silhouette of the mark for the Android status-bar icon. */
async function statusIcon(size) {
  const trimmed = await sharp(MARK).trim({ threshold: 20 }).toBuffer()
  const alpha = await sharp(trimmed)
    .resize({ height: Math.round(size * 0.9), fit: 'inside' })
    .ensureAlpha()
    .greyscale()
    .negate()
    .toBuffer()
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: alpha, gravity: 'centre', blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function android() {
  const res = 'android/app/src/main/res'
  if (!existsSync(res)) return console.log('android/ missing, skipped')
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
  for (const [density, factor] of Object.entries(densities)) {
    const dir = `${res}/mipmap-${density}`
    await mkdir(dir, { recursive: true })
    const launcher = Math.round(48 * factor)
    await writeFile(
      `${dir}/ic_launcher.png`,
      await framed(launcher, 0.72, WHITE),
    )
    await writeFile(
      `${dir}/ic_launcher_round.png`,
      await framed(launcher, 0.62, WHITE),
    )
    // Adaptive icon foreground: 108dp with the drawing inside the central 66dp.
    await writeFile(
      `${dir}/ic_launcher_foreground.png`,
      await framed(Math.round(108 * factor), 0.45, { ...WHITE, alpha: 0 }),
    )
    const drawable = `${res}/drawable-${density}`
    await mkdir(drawable, { recursive: true })
    await writeFile(
      `${drawable}/ic_stat_randevum.png`,
      await statusIcon(Math.round(24 * factor)),
    )
  }
  // Splash: the mark on the page background, one square image per density bucket.
  for (const [dir, size] of Object.entries({
    drawable: 480,
    'drawable-port-mdpi': 480,
    'drawable-port-hdpi': 800,
    'drawable-port-xhdpi': 1280,
    'drawable-port-xxhdpi': 1600,
    'drawable-port-xxxhdpi': 1920,
    'drawable-land-mdpi': 480,
    'drawable-land-hdpi': 800,
    'drawable-land-xhdpi': 1280,
    'drawable-land-xxhdpi': 1600,
    'drawable-land-xxxhdpi': 1920,
  })) {
    await mkdir(`${res}/${dir}`, { recursive: true })
    await writeFile(
      `${res}/${dir}/splash.png`,
      await framed(size, 0.28, { r: 244, g: 247, b: 251, alpha: 1 }),
    )
  }
  await mkdir(`${res}/values`, { recursive: true })
  await writeFile(
    `${res}/values/ic_launcher_background.xml`,
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n',
  )
  console.log('android assets written')
}

async function ios() {
  const assets = 'ios/App/App/Assets.xcassets'
  if (!existsSync(assets)) return console.log('ios/ missing, skipped')
  const icon = `${assets}/AppIcon.appiconset`
  await mkdir(icon, { recursive: true })
  await writeFile(`${icon}/AppIcon-512@2x.png`, await framed(1024, 0.72, WHITE))
  await writeFile(
    `${icon}/Contents.json`,
    JSON.stringify(
      {
        images: [
          {
            filename: 'AppIcon-512@2x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ),
  )
  const splash = `${assets}/Splash.imageset`
  await mkdir(splash, { recursive: true })
  const image = await framed(2732, 0.28, { r: 244, g: 247, b: 251, alpha: 1 })
  for (const name of [
    'splash-2732x2732.png',
    'splash-2732x2732-1.png',
    'splash-2732x2732-2.png',
  ]) {
    await writeFile(`${splash}/${name}`, image)
  }
  await writeFile(
    `${splash}/Contents.json`,
    JSON.stringify(
      {
        images: [
          {
            filename: 'splash-2732x2732-2.png',
            idiom: 'universal',
            scale: '1x',
          },
          {
            filename: 'splash-2732x2732-1.png',
            idiom: 'universal',
            scale: '2x',
          },
          { filename: 'splash-2732x2732.png', idiom: 'universal', scale: '3x' },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ),
  )
  console.log('ios assets written')
}

void NAVY
await android()
await ios()
