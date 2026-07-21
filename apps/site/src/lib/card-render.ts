/*
 * Client-side share-card renderer. Runs in the curator's browser at approval
 * time — the same human tap that publishes a specimen also mints its
 * postcard. Zero server dependencies; the Worker only stores the PNG.
 */
import { splitByVariant, type VariantId } from '@ratherthan/detector'
import { attributionLabel } from '$lib/attribution.ts'
import { CARD_HEIGHT, CARD_WIDTH } from '$lib/card-style.ts'

const BG = '#0d1117'
const BORDER = '#2d333b'
const TEXT = '#e6edf3'
const DIM = '#8b949e'
const ACCENT = '#7ee787'
/* ui-monospace is not valid inside a canvas font shorthand everywhere;
   list concrete faces and let the platform pick, like the site does. */
const MONO = "'Cascadia Code', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"

interface CardQuote {
  text: string
  variant: VariantId
  model: string | null
  integration: string | null
}

interface Word {
  text: string
  accent: boolean
}

/** Split into words, marking those inside the contrastive phrase green. */
function words(quote: CardQuote): Word[] {
  const chunk = (s: string, accent: boolean) =>
    s
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ text, accent }))
  const parts = splitByVariant(quote.text, quote.variant)
  if (!parts) return chunk(quote.text, false)
  return [...chunk(parts.left, false), ...chunk(parts.phrase, true), ...chunk(parts.right, false)]
}

/** Break a word too wide for a line into hard character chunks that fit. */
function hardWrap(ctx: CanvasRenderingContext2D, word: Word, maxWidth: number): Word[] {
  if (ctx.measureText(word.text).width <= maxWidth) return [word]
  const pieces: Word[] = []
  let piece = ''
  for (const ch of word.text) {
    if (piece && ctx.measureText(piece + ch).width > maxWidth) {
      pieces.push({ text: piece, accent: word.accent })
      piece = ch
    } else piece += ch
  }
  if (piece) pieces.push({ text: piece, accent: word.accent })
  return pieces
}

function layout(ctx: CanvasRenderingContext2D, list: Word[], size: number, maxWidth: number) {
  ctx.font = `700 ${size}px ${MONO}`
  const space = ctx.measureText(' ').width
  const lines: Word[][] = []
  let line: Word[] = []
  let width = 0
  for (const word of list.flatMap((w) => hardWrap(ctx, w, maxWidth))) {
    const w = ctx.measureText(word.text).width
    if (line.length > 0 && width + space + w > maxWidth) {
      lines.push(line)
      line = []
      width = 0
    }
    width += (line.length > 0 ? space : 0) + w
    line.push(word)
  }
  if (line.length > 0) lines.push(line)
  return lines
}

export async function renderCardPng(quote: CardQuote): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  // the double frame, as on the default card and the hero's framing ceremony
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80)
  ctx.strokeRect(52, 52, CARD_WIDTH - 104, CARD_HEIGHT - 104)

  // autosize: shrink until the specimen fits its stage
  const maxWidth = CARD_WIDTH - 200
  const list = words(quote)
  let size = 56
  let lines = layout(ctx, list, size, maxWidth)
  while (size > 24 && lines.length * size * 1.5 > 380) {
    size -= 4
    lines = layout(ctx, list, size, maxWidth)
  }

  const lineHeight = size * 1.5
  const blockHeight = lines.length * lineHeight
  let y = (CARD_HEIGHT - 130 - blockHeight) / 2 + lineHeight / 2 + 20
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${size}px ${MONO}`
  const space = ctx.measureText(' ').width
  for (const line of lines) {
    const lineWidth =
      line.reduce((sum, w) => sum + ctx.measureText(w.text).width, 0) + space * (line.length - 1)
    let x = (CARD_WIDTH - lineWidth) / 2
    for (const word of line) {
      ctx.fillStyle = word.accent ? ACCENT : TEXT
      ctx.fillText(word.text, x, y)
      x += ctx.measureText(word.text).width + space
    }
    y += lineHeight
  }

  // attribution, dim, centered — shrunk to fit two 60-char labels if needed
  const label = `— ${attributionLabel(quote)}`
  let attrSize = 26
  ctx.font = `400 ${attrSize}px ${MONO}`
  while (attrSize > 15 && ctx.measureText(label).width > CARD_WIDTH - 120) {
    attrSize -= 2
    ctx.font = `400 ${attrSize}px ${MONO}`
  }
  ctx.fillStyle = DIM
  ctx.textAlign = 'center'
  ctx.fillText(label, CARD_WIDTH / 2, CARD_HEIGHT - 155)

  // plaque line: transcript dot + domain
  ctx.font = `400 30px ${MONO}`
  const domain = 'ratherthan.ai'
  const domainWidth = ctx.measureText(domain).width
  const dotR = 10
  const startX = (CARD_WIDTH - (domainWidth + dotR * 2 + 18)) / 2
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.arc(startX + dotR, CARD_HEIGHT - 105, dotR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = DIM
  ctx.textAlign = 'left'
  ctx.fillText(domain, startX + dotR * 2 + 18, CARD_HEIGHT - 105)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('canvas produced no blob')
  return blob
}

/** Render and upload; best-effort — approval must never fail on minting. */
export async function mintCard(id: string, quote: CardQuote): Promise<boolean> {
  try {
    const png = await renderCardPng(quote)
    const res = await fetch(`/admin/card/${id}`, { method: 'PUT', body: png })
    return res.ok
  } catch {
    return false
  }
}
