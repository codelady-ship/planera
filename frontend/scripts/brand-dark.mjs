// Night-mode variants of the logo (#93): the navy parts of the wordmark and
// the slogan become light, the teal, blue and white parts stay as they are.
// Run from frontend/: node scripts/brand-dark.mjs
import sharp from 'sharp'

const LIGHT = [244, 247, 251] // --brand-mist

/** Navy in the logo: dark, clearly blue (b well above r), e.g. #062359. */
function isNavy(r, g, b) {
  return b > r + 25 && r < 50 && g < 60 && b < 120
}

async function convert(source, target) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    if (isNavy(r, g, b)) {
      // Keep the anti-aliased edge: blend towards light by how dark the pixel is.
      const depth = 1 - Math.min(1, (r + g) / 160)
      data[i] = Math.round(r + (LIGHT[0] - r) * Math.max(depth, 0.85))
      data[i + 1] = Math.round(g + (LIGHT[1] - g) * Math.max(depth, 0.85))
      data[i + 2] = Math.round(b + (LIGHT[2] - b) * Math.max(depth, 0.85))
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(target)
  console.log('written', target)
}

await convert(
  'public/brand/planera-wordmark.png',
  'public/brand/planera-wordmark-dark.png',
)
await convert(
  'public/brand/planera-logo.png',
  'public/brand/planera-logo-dark.png',
)
