/**
 * The museum's traffic, read honestly.
 *
 *   node scripts/analytics.mjs            # print the report
 *   node scripts/analytics.mjs --write    # …and update the growth board
 *
 * Cloudflare's zone dataset counts every byte the edge serves: bundle chunks,
 * robots.txt, uptime probes, every lab's crawler. None of that is a visitor.
 * This filters the plumbing out and reports what is left, alongside the bot
 * traffic it removed — the split is itself worth watching for a museum of
 * agent speech.
 *
 * Needs CLOUDFLARE_ANALYTICS_TOKEN (Zone → Analytics → Read) in .env. The
 * free plan caps httpRequestsAdaptiveGroups at a one-day window, so the
 * report is always the last 23 hours.
 *
 * No visitor beacon, ever. These are request counts — direction, not people.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BOARD = join(ROOT, 'docs', 'growth-board.html')
const ZONE = '3c356502e45915599835ecca61069ec4'
const WINDOW_HOURS = 23
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql'

/* Paths that are never a human arriving: the bundle, crawler bookkeeping,
   SvelteKit's data fetches, and the cards (an image fetch is a scrape, not a
   visit — Twitterbot's card pulls are reported separately, on purpose). */
const ASSET_PATH =
  /^\/_app\/|^\/robots\.txt$|^\/sitemap\.xml$|^\/\.well-known\/|^\/cdn-cgi\/|\/__data\.json$/
const ASSET_EXT = /\.(js|css|png|svg|ico|webmanifest|woff2?|xml|txt)$/

/* Substring match on the UA, lowercased. Deliberately broad: a name that only
   appears in crawler UAs costs nothing to over-match, and under-counting bots
   is the failure that flatters us. */
const BOT_UA = [
  'bot',
  'crawler',
  'spider',
  'slurp',
  'curl',
  'wget',
  'python-requests',
  'headlesschrome',
  'chrome-lighthouse',
  'node-fetch',
  'go-http-client',
  'monitor',
  'uptime',
  'preview',
  'scan',
  'fetch',
]

/* Ours. The director browsing the museum is not an audience. */
const OWN_UA = ['wrangler', 'undici', 'claude-code']

const isAsset = (path) => ASSET_PATH.test(path) || ASSET_EXT.test(path)
const isBot = (ua) => {
  const lower = ua.toLowerCase()
  return BOT_UA.some((needle) => lower.includes(needle)) || OWN_UA.some((n) => lower.includes(n))
}

/* Most crawlers hide their name mid-string behind a Mozilla prefix
   ("Mozilla/5.0 (compatible; GPTBot/1.2; …)"), so the leading token is
   almost always the useless one. */
function botName(ua) {
  const named = ua.match(/([\w-]*(?:bot|crawler|spider|scanner|externalhit|preview)[\w-]*)/i)
  return (named?.[1] ?? ua.split('/')[0]).slice(0, 28)
}

function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const line = readFileSync(join(ROOT, '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${name}=`))
    if (line)
      return line
        .slice(name.length + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
  } catch {
    /* no .env — fall through to the error below */
  }
  throw new Error(`${name} is not set (put it in .env or the environment)`)
}

const QUERY = `query($zone:String!,$since:Time!,$until:Time!){
  viewer{zones(filter:{zoneTag:$zone}){
    httpRequestsAdaptiveGroups(limit:5000,filter:{datetime_geq:$since,datetime_lt:$until},orderBy:[count_DESC]){
      count
      dimensions{clientRequestPath clientRequestHTTPHost userAgent clientCountryName edgeResponseStatus}
    }
  }}
}`

async function fetchRows(token, since, until) {
  const response = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { zone: ZONE, since, until } }),
  })
  if (!response.ok) throw new Error(`Cloudflare returned ${response.status}`)
  const body = await response.json()
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '))
  const rows = body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups
  if (!rows) throw new Error('no rows in response — check the token has Zone → Analytics → Read')
  return rows.map((row) => ({ count: row.count, ...row.dimensions }))
}

function tally(rows, key, limit) {
  const counts = new Map()
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + row.count)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

function summarize(rows) {
  const site = rows.filter((row) => row.clientRequestHTTPHost === 'ratherthan.ai')
  const cards = rows.filter((row) => row.clientRequestHTTPHost === 'cards.ratherthan.ai')
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  /* A page a person read answered 2xx/3xx. Vulnerability probes come with
     browser user agents and are indistinguishable until you notice they all
     404 — /.git/config, /wp-login.php, and friends. */
  const pages = site.filter(
    (row) => !isAsset(row.clientRequestPath) && Number(row.edgeResponseStatus) < 400,
  )
  const human = pages.filter((row) => !isBot(row.userAgent))
  const bots = site.filter((row) => isBot(row.userAgent))

  /* X's scraper, across both hosts: the closest thing we have to a log of
     whether a card was actually fetched for a post. */
  const twitterbot = rows.filter((row) => /twitterbot/i.test(row.userAgent))

  /* Tripwire, not a metric. Zone-level Web Analytics once collected RUM
     beacons here while the museum promised no tracking (disabled
     2026-07-30). A 2xx on this path means someone turned it back on —
     that must never hide inside the plumbing filter again. */
  const beacons = rows
    .filter(
      (row) => row.clientRequestPath === '/cdn-cgi/rum' && Number(row.edgeResponseStatus) < 300,
    )
    .reduce((sum, row) => sum + row.count, 0)

  return {
    total,
    beacons,
    humanRequests: human.reduce((sum, row) => sum + row.count, 0),
    botRequests: bots.reduce((sum, row) => sum + row.count, 0),
    cardRequests: cards.reduce((sum, row) => sum + row.count, 0),
    topPaths: tally(human, (row) => row.clientRequestPath, 15),
    countries: tally(human, (row) => row.clientCountryName, 10),
    topBots: tally(bots, (row) => botName(row.userAgent), 12),
    twitterbot: tally(
      twitterbot,
      (row) => `${row.clientRequestHTTPHost}${row.clientRequestPath}`,
      10,
    ),
    errorRequests: rows
      .filter((row) => Number(row.edgeResponseStatus) >= 500)
      .reduce((sum, row) => sum + row.count, 0),
    errors: tally(
      rows.filter((row) => Number(row.edgeResponseStatus) >= 500),
      (row) => `${row.edgeResponseStatus} ${row.clientRequestPath}`,
      8,
    ),
  }
}

function report(summary, since, until) {
  const pct = (n) => (summary.total ? `${Math.round((n / summary.total) * 100)}%` : '—')
  const lines = [
    ...(summary.beacons
      ? [
          `!! TRACKING: ${summary.beacons} RUM beacons accepted on /cdn-cgi/rum — Web Analytics is ON again. Disable it (dashboard → Web Analytics) and tell the director.`,
          '',
        ]
      : []),
    `window     ${since} → ${until}`,
    `requests   ${summary.total} total · ${summary.botRequests} bot (${pct(summary.botRequests)}) · ${summary.cardRequests} card image`,
    `human      ${summary.humanRequests} page requests after filtering (${pct(summary.humanRequests)})`,
    '',
    'pages someone actually asked for',
    ...summary.topPaths.map(([path, count]) => `  ${String(count).padStart(4)}  ${path}`),
    '',
    'countries (filtered)',
    `  ${summary.countries.map(([code, count]) => `${code} ${count}`).join(' · ')}`,
    '',
    'bots removed',
    `  ${summary.topBots.map(([name, count]) => `${name} ${count}`).join(' · ')}`,
    '',
    'Twitterbot fetches',
    ...(summary.twitterbot.length
      ? summary.twitterbot.map(([url, count]) => `  ${String(count).padStart(4)}  ${url}`)
      : ['  none in this window']),
  ]
  if (summary.errors.length)
    lines.push(
      '',
      `server errors — ${summary.errorRequests} (${pct(summary.errorRequests)} of all requests)`,
      ...summary.errors.map(([what, count]) => `  ${String(count).padStart(4)}  ${what}`),
    )
  return lines.join('\n')
}

/* The board is hand-curated and lives outside git (docs/ is ignored), so the
   script only ever writes between the RT_AUTO markers, and only after a
   successful read. Everything else in RT_ANALYTICS stays Laurel's. */
function updateBoard(summary, date, until) {
  const html = readFileSync(BOARD, 'utf8')
  const daily =
    `        { date: "${date}", requests: ${summary.total}, est: false, ` +
    `note: "${WINDOW_HOURS}h window ending ${until} — ${summary.humanRequests} after filtering assets and bots (${summary.botRequests} bot)" }`
  const countries =
    '          ' +
    summary.countries
      .map(([code, count]) => `{ code: "${code}", requests: ${count} }`)
      .reduce((rows, entry, at) => {
        if (at % 2 === 0) rows.push([entry])
        else rows[rows.length - 1].push(entry)
        return rows
      }, [])
      .map((pair) => pair.join(', '))
      .join(',\n          ')

  let next = replaceBlock(html, 'daily', daily)
  next = replaceBlock(next, 'countries', countries)
  next = replaceBlock(next, 'window', `        window: "last ${WINDOW_HOURS}h (ending ${until})",`)
  next = next.replace(/updated: "[^"]*"/, `updated: "${until}"`)

  writeFileSync(`${BOARD}.bak`, html)
  writeFileSync(BOARD, next)
}

/* An append-only marker: today's row is added, or replaced if the script
   already ran today. Older rows are never touched. */
function replaceBlock(html, name, entry) {
  const open = `/* RT_AUTO:${name} */`
  const close = `/* RT_AUTO:end:${name} */`
  const from = html.indexOf(open)
  const to = html.indexOf(close)
  if (from === -1 || to === -1) throw new Error(`missing ${open} … ${close} markers in the board`)
  const existing = html.slice(from + open.length, to)
  const body =
    name === 'daily'
      ? mergeDaily(existing, entry)
      : name === 'countries'
        ? `\n${entry}\n        `
        : `\n${entry}\n      `
  return html.slice(0, from + open.length) + body + html.slice(to)
}

function mergeDaily(existing, entry) {
  const date = entry.match(/date: "([^"]+)"/)[1]
  const rows = existing
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !line.includes(`date: "${date}"`))
    .map((line) => (line.trim().endsWith(',') ? line : `${line},`))
  rows.push(entry)
  return `\n${rows.join('\n')}\n      `
}

const until = new Date()
until.setUTCMinutes(0, 0, 0)
const since = new Date(until.getTime() - WINDOW_HOURS * 3600_000)
const iso = (date) => `${date.toISOString().slice(0, 19)}Z`

const summary = summarize(
  await fetchRows(env('CLOUDFLARE_ANALYTICS_TOKEN'), iso(since), iso(until)),
)
console.log(report(summary, iso(since), iso(until)))

if (process.argv.includes('--write')) {
  updateBoard(summary, until.toISOString().slice(0, 10), iso(until))
  console.log(`\nwrote docs/growth-board.html (previous copy at growth-board.html.bak)`)
}
