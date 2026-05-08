#!/usr/bin/env node
// One-shot generator for the young-learner illustration placeholder bundle.
//
// Slatework cannot bundle Storyset SVGs directly (license requires a
// per-pack download). This script emits ~100 simple labelled placeholder
// SVGs and a manifest.json. Replace the SVGs with real Storyset (or
// Open Doodles) artwork before public launch — the keyword mapping in
// manifest.json is stable so the rendered output upgrades without code
// changes.
//
// Usage (Windows PowerShell or git-bash):
//   node scripts/gen-young-learner-bundle.js
//
// Output: assets/illustrations/young-learner/<stem>.svg + manifest.json
//
// CREDITS.md is hand-authored alongside; see that file.

'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.join('assets', 'illustrations', 'young-learner');
fs.mkdirSync(dir, { recursive: true });

// Each entry: [filename-stem, display label, hex color, [keywords...]].
// Keywords are matched by Slatework.SlideshowImages.resolve() — keep them
// lowercase, prefer single nouns, allow synonyms (e.g. 'mom' for 'mother').
const items = [
  // Animals (~20)
  ['farm-cat',     'cat',     '#94a3b8', ['cat','animal','pet']],
  ['farm-dog',     'dog',     '#a16207', ['dog','animal','pet']],
  ['farm-cow',     'cow',     '#fef3c7', ['cow','farm','animal']],
  ['farm-pig',     'pig',     '#fbcfe8', ['pig','farm','animal']],
  ['farm-sheep',   'sheep',   '#f1f5f9', ['sheep','farm','animal']],
  ['farm-chicken', 'chicken', '#fde68a', ['chicken','bird','farm']],
  ['farm-duck',    'duck',    '#fef08a', ['duck','bird']],
  ['farm-horse',   'horse',   '#92400e', ['horse','animal']],
  ['farm-rabbit',  'rabbit',  '#e2e8f0', ['rabbit','animal']],
  ['farm-mouse',   'mouse',   '#d4d4d8', ['mouse','animal']],
  ['wild-bird',    'bird',    '#3b82f6', ['bird','animal']],
  ['wild-fish',    'fish',    '#06b6d4', ['fish','animal','sea']],
  ['wild-bear',    'bear',    '#78350f', ['bear','animal']],
  ['wild-lion',    'lion',    '#f59e0b', ['lion','animal']],
  ['wild-tiger',   'tiger',   '#ea580c', ['tiger','animal']],
  ['wild-elephant','elephant','#9ca3af', ['elephant','animal']],
  ['wild-monkey',  'monkey',  '#a16207', ['monkey','animal']],
  ['wild-frog',    'frog',    '#22c55e', ['frog','animal']],
  ['wild-bee',     'bee',     '#fbbf24', ['bee','insect']],
  ['wild-butterfly','butterfly','#a855f7', ['butterfly','insect']],
  // Food (~15)
  ['food-apple',   'apple',   '#dc2626', ['apple','fruit','food']],
  ['food-banana',  'banana',  '#fde047', ['banana','fruit','food']],
  ['food-orange',  'orange',  '#f97316', ['orange','fruit','food']],
  ['food-bread',   'bread',   '#ca8a04', ['bread','food']],
  ['food-milk',    'milk',    '#f8fafc', ['milk','drink']],
  ['food-water',   'water',   '#0ea5e9', ['water','drink']],
  ['food-rice',    'rice',    '#fef9c3', ['rice','food']],
  ['food-noodle',  'noodle',  '#fde68a', ['noodle','noodles','food']],
  ['food-soup',    'soup',    '#e07b39', ['soup','food']],
  ['food-cake',    'cake',    '#f9a8d4', ['cake','food','dessert']],
  ['food-egg',     'egg',     '#fef9c3', ['egg','food']],
  ['food-cheese',  'cheese',  '#fbbf24', ['cheese','food']],
  ['food-chocolate','chocolate','#78350f', ['chocolate','food']],
  ['food-icecream','ice cream','#f9a8d4', ['ice cream','dessert']],
  ['food-pizza',   'pizza',   '#dc2626', ['pizza','food']],
  // Family (~10)
  ['family-mother',     'mother',     '#f9a8d4', ['mother','mom','family']],
  ['family-father',     'father',     '#1d4ed8', ['father','dad','family']],
  ['family-sister',     'sister',     '#ec4899', ['sister','family']],
  ['family-brother',    'brother',    '#3b82f6', ['brother','family']],
  ['family-baby',       'baby',       '#fecaca', ['baby','family']],
  ['family-grandmother','grandmother','#cbd5e1', ['grandmother','grandma','family']],
  ['family-grandfather','grandfather','#9ca3af', ['grandfather','grandpa','family']],
  ['family-family',     'family',     '#a855f7', ['family']],
  ['family-friend',     'friend',     '#22c55e', ['friend','friends']],
  ['family-teacher',    'teacher',    '#0891b2', ['teacher','school']],
  // Body (~12)
  ['body-head',   'head',   '#fde68a', ['head','body']],
  ['body-hair',   'hair',   '#78350f', ['hair','body']],
  ['body-eye',    'eye',    '#0ea5e9', ['eye','body']],
  ['body-nose',   'nose',   '#fbcfe8', ['nose','body']],
  ['body-mouth',  'mouth',  '#dc2626', ['mouth','body']],
  ['body-ear',    'ear',    '#fbcfe8', ['ear','body']],
  ['body-hand',   'hand',   '#fde68a', ['hand','body']],
  ['body-foot',   'foot',   '#fde68a', ['foot','body']],
  ['body-arm',    'arm',    '#fde68a', ['arm','body']],
  ['body-leg',    'leg',    '#fde68a', ['leg','body']],
  ['body-finger', 'finger', '#fde68a', ['finger','body']],
  ['body-tooth',  'tooth',  '#f8fafc', ['tooth','body']],
  // Verbs (~15)
  ['verb-run',    'run',    '#22c55e', ['run','action']],
  ['verb-jump',   'jump',   '#a855f7', ['jump','action']],
  ['verb-walk',   'walk',   '#3b82f6', ['walk','action']],
  ['verb-sit',    'sit',    '#06b6d4', ['sit','action']],
  ['verb-stand',  'stand',  '#0891b2', ['stand','action']],
  ['verb-sleep',  'sleep',  '#6366f1', ['sleep','action']],
  ['verb-eat',    'eat',    '#f97316', ['eat','action']],
  ['verb-drink',  'drink',  '#0ea5e9', ['drink','action']],
  ['verb-read',   'read',   '#7c3aed', ['read','action','book']],
  ['verb-write',  'write',  '#1d4ed8', ['write','action']],
  ['verb-sing',   'sing',   '#ec4899', ['sing','action']],
  ['verb-dance',  'dance',  '#a855f7', ['dance','action']],
  ['verb-play',   'play',   '#22c55e', ['play','action']],
  ['verb-smile',  'smile',  '#fbbf24', ['smile','action']],
  ['verb-listen', 'listen', '#3b82f6', ['listen','action']],
  // School (~12)
  ['school-pencil',   'pencil',   '#fbbf24', ['pencil','school','write']],
  ['school-pen',      'pen',      '#1d4ed8', ['pen','school','write']],
  ['school-paper',    'paper',    '#f8fafc', ['paper','school']],
  ['school-book',     'book',     '#7c3aed', ['book','school','read']],
  ['school-notebook', 'notebook', '#06b6d4', ['notebook','school']],
  ['school-ruler',    'ruler',    '#fde68a', ['ruler','school']],
  ['school-eraser',   'eraser',   '#fecaca', ['eraser','rubber','school']],
  ['school-scissors', 'scissors', '#94a3b8', ['scissors','school']],
  ['school-glue',     'glue',     '#22c55e', ['glue','school']],
  ['school-bag',      'bag',      '#dc2626', ['bag','school','school bag','schoolbag']],
  ['school-desk',     'desk',     '#92400e', ['desk','school']],
  ['school-chair',    'chair',    '#a16207', ['chair','school']],
  // Weather (~6)
  ['weather-sun',     'sun',     '#fbbf24', ['sun','weather','hot']],
  ['weather-cloud',   'cloud',   '#cbd5e1', ['cloud','weather']],
  ['weather-rain',    'rain',    '#0ea5e9', ['rain','weather']],
  ['weather-snow',    'snow',    '#f8fafc', ['snow','weather','cold']],
  ['weather-wind',    'wind',    '#94a3b8', ['wind','weather']],
  ['weather-rainbow', 'rainbow', '#a855f7', ['rainbow','weather']],
  // Numbers (~5) and colors (~5)
  ['number-one',   'one',   '#fde68a', ['one','1','number']],
  ['number-two',   'two',   '#fbcfe8', ['two','2','number']],
  ['number-three', 'three', '#bfdbfe', ['three','3','number']],
  ['number-four',  'four',  '#bbf7d0', ['four','4','number']],
  ['number-five',  'five',  '#fed7aa', ['five','5','number']],
  ['color-red',    'red',    '#dc2626', ['red','color']],
  ['color-blue',   'blue',   '#1d4ed8', ['blue','color']],
  ['color-yellow', 'yellow', '#fde047', ['yellow','color']],
  ['color-green',  'green',  '#22c55e', ['green','color']],
  ['color-black',  'black',  '#171717', ['black','color']],
  // Misc tokens used by fallback deck warmup keywords
  ['greet-hello',     'hello',     '#22c55e', ['hello','greeting']],
  ['greet-smile',     'smile',     '#fbbf24', ['smile','happy']],
  ['greet-discussion','discussion','#06b6d4', ['discussion','talk']],
  ['greet-pair-work', 'pair work', '#a855f7', ['pair work','pairs']],
  ['greet-friends',   'friends',   '#22c55e', ['friends','friend']],
  ['greet-classroom', 'classroom', '#0891b2', ['classroom','class']],
  ['greet-student',   'student',   '#3b82f6', ['student','pupil']],
];

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svg(label, color) {
  const safe = escXml(label);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="' + safe + '">',
    '  <title>' + safe + '</title>',
    '  <rect width="320" height="240" rx="16" fill="' + color + '" fill-opacity="0.18"/>',
    '  <circle cx="160" cy="104" r="56" fill="' + color + '" fill-opacity="0.55"/>',
    '  <rect x="56" y="176" width="208" height="30" rx="6" fill="' + color + '" fill-opacity="0.22"/>',
    '  <text x="160" y="196" font-family="\'IBM Plex Sans\', system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="#0f172a">' + safe + '</text>',
    '</svg>',
    ''
  ].join('\n');
}

const manifestEntries = [];
for (const [stem, label, color, keywords] of items) {
  const file = stem + '.svg';
  fs.writeFileSync(path.join(dir, file), svg(label, color), 'utf8');
  manifestEntries.push({ file, keywords });
}
const manifest = { schema: 1, illustrations: manifestEntries };
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log('Wrote', manifestEntries.length, 'SVG files + manifest.json into', dir);
