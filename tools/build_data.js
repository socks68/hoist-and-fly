#!/usr/bin/env node
// Merge and validate the written content (content/*.js), attach image metadata (data/flagmeta.json,
// data/ratios.tsv) and write data/data.json, which the page embeds as window.HF.
const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');
const africa = require('../content/africa.js');
const asia = require('../content/asia.js');
const europe = require('../content/europe.js');
const amo = require('../content/americas_oceania.js');
const extras = require('../content/extras.js');
const meta = JSON.parse(fs.readFileSync(path.join(base, 'data', 'flagmeta.json'), 'utf8'));

const regions = { af: africa, as: asia, eu: europe, na: amo.na, sa: amo.sa, oc: amo.oc };
const flags = [];
for (const [r, list] of Object.entries(regions)) for (const f of list) flags.push({ ...f, r });

// proportions (height:length) from the source drawings
const ratios = {};
for (const line of fs.readFileSync(path.join(base, 'data', 'ratios.tsv'), 'utf8').trim().split('\n')) {
  const [name, , num, den] = line.split('\t');
  ratios[name] = [Number(num), Number(den)];
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const errors = [];
const codes = new Set();
const COLORS = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'white', 'black']);
const TAGS = new Set(['hstripes', 'vstripes', 'diagonal', 'cross', 'triangle', 'canton', 'star', 'crescent', 'sun', 'circle', 'emblem', 'animal', 'plant', 'weapon', 'text', 'map', 'unionjack']);
for (const f of flags) {
  if (codes.has(f.c)) errors.push('duplicate ' + f.c);
  codes.add(f.c);
  for (const k of ['c', 'n', 'cap', 'y', 'col', 'tags', 'why', 'tip', 'fact', 'like']) if (f[k] === undefined) errors.push(`${f.c}: missing ${k}`);
  if (!meta[f.c]) errors.push(`${f.c}: no image`);
  for (const c of f.col || []) if (!COLORS.has(c)) errors.push(`${f.c}: bad colour ${c}`);
  for (const t of f.tags || []) if (!TAGS.has(t)) errors.push(`${f.c}: bad tag ${t}`);
  if (f.alt && !meta[f.alt.f]) errors.push(`${f.c}: no alt image ${f.alt.f}`);
  if (/\s—\s|--/.test(f.why + f.tip + f.fact)) errors.push(`${f.c}: dash style`);
  if (f.c === 'np') f.ratio = '≈1.22 : 1';
  else if (ratios[f.c]) { const [a, b] = ratios[f.c]; const g = gcd(a, b); f.ratio = `${a / g} : ${b / g}`; }
  else errors.push(`${f.c}: no ratio`);
}
for (const f of flags) for (const l of f.like) if (!codes.has(l)) errors.push(`${f.c}: lookalike ${l} unknown`);
for (const g of extras.groups) for (const [c] of g.m) if (!codes.has(c)) errors.push(`group ${g.id}: ${c} unknown`);
for (const g of extras.families) for (const c of g.m) if (!codes.has(c)) errors.push(`family ${g.t}: ${c} unknown`);
for (const g of extras.records) for (const c of g.m) if (!codes.has(c)) errors.push(`record ${g.t}: ${c} unknown`);
const counts = Object.fromEntries(Object.keys(regions).map(r => [r, flags.filter(f => f.r === r).length]));
if (flags.length !== 197) errors.push('expected 197 flags, got ' + flags.length);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// make lookalike lists symmetric so every pair shows up from both sides
const likeMap = Object.fromEntries(flags.map(f => [f.c, new Set(f.like)]));
for (const f of flags) for (const l of f.like) likeMap[l].add(f.c);
for (const f of flags) f.like = [...likeMap[f.c]].slice(0, 5);

flags.sort((a, b) => a.n.localeCompare(b.n, 'en'));
const usedMeta = {};
for (const f of flags) { usedMeta[f.c] = meta[f.c]; if (f.alt) usedMeta[f.alt.f] = meta[f.alt.f]; }
for (const k of Object.keys(usedMeta)) { const m = usedMeta[k]; usedMeta[k] = { f: m.f, w: Math.round(m.w * 100) / 100, h: Math.round(m.h * 100) / 100 }; }

const out = { flags, meta: usedMeta, groups: extras.groups, families: extras.families, records: extras.records, glossary: extras.glossary };
fs.writeFileSync(path.join(base, 'data', 'data.json'), JSON.stringify(out));
console.log('ok', flags.length, 'flags', counts, (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
