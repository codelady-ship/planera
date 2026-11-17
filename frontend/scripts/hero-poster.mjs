// Placeholder posters for the hero planner video (HeroPlannerVideo).
// Run from frontend/: node scripts/hero-poster.mjs
//
// Writes a top-down still of a paper day planner on a clipboard in flat
// brand colours (docs/DESIGN.md, no gradients):
//   public/media/hero-planner-poster.jpg  - blank planner (first frame)
//   public/media/hero-planner-final.jpg   - completed planner (last frame)
// When the real clip arrives, replace both files with frames taken from it.
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const OUT = 'public/media'
const W = 1280
const H = 720

const C = {
  desk: '#E6ECF4',
  deskLine: '#D7DFEA',
  board: '#072968',
  clip: '#9AA6BA',
  clipDark: '#6B7890',
  paper: '#FFFFFF',
  rule: '#DCE3EE',
  ink: '#0F1B33',
  muted: '#8A96AB',
  teal: '#00C3BD',
  tealDark: '#00807C',
  blue: '#1D5FE0',
  navy: '#072968',
}

const BOARD = { x: 400, y: 40, w: 480, h: 650 }
const PAPER = { x: 430, y: 110, w: 420, h: 555 }
const ROWS = 9
const ROW_TOP = PAPER.y + 110
const ROW_H = 46

// Task line lengths and priorities for the filled planner.
const TASKS = [
  [190, C.tealDark],
  [150, C.blue],
  [210, C.navy],
  [120, C.tealDark],
  [175, C.blue],
  [140, C.navy],
  [200, C.tealDark],
  [160, C.blue],
  [130, C.navy],
]

function rows(filled) {
  let out = ''
  for (let i = 0; i < ROWS; i += 1) {
    const y = ROW_TOP + i * ROW_H
    const box = PAPER.x + 26
    out += `<line x1="${PAPER.x + 20}" y1="${y + ROW_H - 8}" x2="${PAPER.x + PAPER.w - 20}" y2="${y + ROW_H - 8}" stroke="${C.rule}" stroke-width="2"/>`
    out += `<rect x="${box}" y="${y + 10}" width="20" height="20" rx="4" fill="none" stroke="${C.muted}" stroke-width="2"/>`
    out += `<line x1="${PAPER.x + 300}" y1="${y + 4}" x2="${PAPER.x + 300}" y2="${y + ROW_H - 8}" stroke="${C.rule}" stroke-width="2"/>`
    if (!filled) continue
    const [len, prio] = TASKS[i]
    // Handwritten task: a slightly wavy ink stroke.
    const x0 = PAPER.x + 62
    const mid = y + 21
    out += `<path d="M${x0} ${mid} q${len / 4} -6 ${len / 2} 0 t${len / 2} 0" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
    // Date: two short strokes.
    out += `<path d="M${PAPER.x + 316} ${mid} h22 M${PAPER.x + 344} ${mid} h28" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
    // Priority dot.
    out += `<circle cx="${PAPER.x + 394}" cy="${mid}" r="7" fill="${prio}"/>`
    // Tick in the box.
    out += `<path d="M${box + 4} ${y + 20} l5 6 l10 -12" fill="none" stroke="${C.tealDark}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  return out
}

function planner(filled) {
  const final = filled
    ? `<circle cx="${PAPER.x + 250}" cy="${PAPER.y + 50}" r="28" fill="none" stroke="${C.tealDark}" stroke-width="4"/>
       <path d="M${PAPER.x + 236} ${PAPER.y + 50} l10 11 l20 -24" fill="none" stroke="${C.tealDark}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
    : ''
  const heading = filled
    ? `<path d="M${PAPER.x + 30} ${PAPER.y + 48} q40 -8 80 0 t80 0" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`
    : `<rect x="${PAPER.x + 30}" y="${PAPER.y + 40}" width="160" height="14" rx="7" fill="${C.rule}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.desk}"/>
  ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${60 + i * 90}" x2="${W}" y2="${60 + i * 90}" stroke="${C.deskLine}" stroke-width="2"/>`).join('')}
  <rect x="${BOARD.x + 10}" y="${BOARD.y + 14}" width="${BOARD.w}" height="${BOARD.h}" rx="22" fill="${C.deskLine}"/>
  <rect x="${BOARD.x}" y="${BOARD.y}" width="${BOARD.w}" height="${BOARD.h}" rx="22" fill="${C.board}"/>
  <rect x="${PAPER.x}" y="${PAPER.y}" width="${PAPER.w}" height="${PAPER.h}" rx="6" fill="${C.paper}"/>
  ${heading}
  <rect x="${PAPER.x + 30}" y="${PAPER.y + 70}" width="90" height="10" rx="5" fill="${C.rule}"/>
  <rect x="${PAPER.x + 316}" y="${PAPER.y + 70}" width="56" height="10" rx="5" fill="${C.rule}"/>
  ${rows(filled)}
  ${final}
  <rect x="${BOARD.x + 150}" y="${BOARD.y + 18}" width="180" height="56" rx="12" fill="${C.clip}"/>
  <rect x="${BOARD.x + 200}" y="${BOARD.y + 6}" width="80" height="26" rx="10" fill="${C.clipDark}"/>
  <rect x="${BOARD.x + 222}" y="${BOARD.y + 12}" width="36" height="12" rx="6" fill="${C.desk}"/>
  <rect x="${BOARD.x + 166}" y="${BOARD.y + 50}" width="148" height="8" rx="4" fill="${C.clipDark}"/>
</svg>`
}

await mkdir(OUT, { recursive: true })
for (const [file, filled] of [
  ['hero-planner-poster.jpg', false],
  ['hero-planner-final.jpg', true],
]) {
  await sharp(Buffer.from(planner(filled)))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`${OUT}/${file}`)
}
console.log('Posters written to', OUT)
