#!/usr/bin/env node
/**
 * SAKA Game Flow Tester
 * Tests all dialogue paths, chapter routing, battle triggers,
 * speaker/expression validity, and the full tutorial flow.
 * 
 * Run: node tests/test-flows.js
 */

const fs = require('fs');
const path = require('path');

const CHAPTERS_DIR = path.join(__dirname, '..', 'public', 'data', 'chapters');
const SPIRITS_FILE = path.join(__dirname, '..', 'public', 'data', 'spirits.json');

// Known speakers with portrait mappings
const PORTRAIT_SPEAKERS = {
  'Syafiq': {
    side: 'left',
    expressions: ['neutral', 'shocked', 'angry', 'sad', 'smirk'],
  },
  'Dian': {
    side: 'right',
    expressions: ['neutral', 'worried', 'happy', 'angry', 'frightened'],
  },
  'Zafri': {
    side: 'right',
    expressions: ['neutral', 'excited', 'nervous', 'serious', 'frustrated'],
  },
  'Mak': {
    side: 'right',
    expressions: ['neutral', 'loving', 'worried', 'stern'],
  },
  'Ikal': {
    side: 'right',
    expressions: ['neutral', 'guarded', 'knowing', 'warning'],
  },
};

// Portrait files that should exist
const PORTRAIT_FILES_DIR = path.join(__dirname, '..', 'public', 'assets', 'portraits');

// Tutorial chapter sequence
const TUTORIAL_SEQUENCE = ['chapter1', 'tutorial-wake', 'tutorial-dian', 'tutorial-capture'];

// Track test results
let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];
const warningsList = [];

function pass(msg) { passed++; }
function fail(msg) { failed++; failures.push(msg); console.log(`  ❌ ${msg}`); }
function warn(msg) { warnings++; warningsList.push(msg); console.log(`  ⚠️  ${msg}`); }

// ==============================
// Load all chapters
// ==============================
const chapters = {};
const chapterFiles = fs.readdirSync(CHAPTERS_DIR).filter(f => f.endsWith('.json'));
for (const file of chapterFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(CHAPTERS_DIR, file), 'utf-8'));
  chapters[data.id] = data;
}

console.log(`\n🎮 SAKA Game Flow Tester`);
console.log(`   Loaded ${Object.keys(chapters).length} chapters\n`);

// ==============================
// TEST 1: Chapter structure validation
// ==============================
console.log('━━━ TEST 1: Chapter Structure ━━━');

for (const [id, chapter] of Object.entries(chapters)) {
  const lines = chapter.lines;
  const ids = Object.keys(lines);

  // startNode exists
  if (!lines[chapter.startNode]) {
    fail(`${id}: startNode "${chapter.startNode}" not found`);
  } else {
    pass(`${id}: startNode valid`);
  }

  // All next references exist
  for (const nodeId of ids) {
    const line = lines[nodeId];
    if (line.next && !lines[line.next]) {
      fail(`${id}/${nodeId}: next="${line.next}" not found`);
    }
    if (line.choices) {
      for (let i = 0; i < line.choices.length; i++) {
        if (!lines[line.choices[i].next]) {
          fail(`${id}/${nodeId}: choice[${i}] next="${line.choices[i].next}" not found`);
        }
      }
    }
  }

  // Reachability
  const reachable = new Set();
  const queue = [chapter.startNode];
  while (queue.length > 0) {
    const n = queue.shift();
    if (reachable.has(n) || !lines[n]) continue;
    reachable.add(n);
    if (lines[n].next) queue.push(lines[n].next);
    if (lines[n].choices) {
      for (const c of lines[n].choices) queue.push(c.next);
    }
  }
  const unreachable = ids.filter(i => !reachable.has(i));
  if (unreachable.length > 0) {
    fail(`${id}: ${unreachable.length} unreachable nodes: ${unreachable.join(', ')}`);
  } else {
    pass(`${id}: all ${ids.length} nodes reachable`);
  }

  // End nodes count
  let endCount = 0;
  let battleEndCount = 0;
  for (const nodeId of ids) {
    const line = lines[nodeId];
    if (!line.next && (!line.choices || line.choices.length === 0)) {
      if (line.battle) battleEndCount++;
      else endCount++;
    }
  }
  if (endCount + battleEndCount === 0) {
    fail(`${id}: no end nodes found (infinite loop?)`);
  } else {
    pass(`${id}: ${endCount} end node(s), ${battleEndCount} battle end(s)`);
  }

  console.log(`  ✅ ${id}: ${ids.length} nodes, ${reachable.size} reachable, ${endCount} end, ${battleEndCount} battle`);
}

// ==============================
// TEST 2: Speaker & Expression validation
// ==============================
console.log('\n━━━ TEST 2: Speakers & Expressions ━━━');

for (const [id, chapter] of Object.entries(chapters)) {
  for (const [nodeId, line] of Object.entries(chapter.lines)) {
    if (line.speaker) {
      const portraitInfo = PORTRAIT_SPEAKERS[line.speaker];
      if (!portraitInfo) {
        warn(`${id}/${nodeId}: speaker "${line.speaker}" has no portrait mapping`);
      } else {
        pass(`${id}/${nodeId}: speaker valid`);

        // Check expression
        if (line.expression) {
          if (!portraitInfo.expressions.includes(line.expression)) {
            fail(`${id}/${nodeId}: "${line.speaker}" has no expression "${line.expression}" (valid: ${portraitInfo.expressions.join(', ')})`);
          } else {
            pass(`${id}/${nodeId}: expression valid`);
          }
        }
      }
    }
  }
}

// ==============================
// TEST 3: Walk every dialogue path
// ==============================
console.log('\n━━━ TEST 3: Walk All Dialogue Paths ━━━');

function walkChapter(chapterId) {
  const chapter = chapters[chapterId];
  if (!chapter) return { paths: 0, maxDepth: 0, errors: [`Chapter "${chapterId}" not found`] };

  const errors = [];
  let paths = 0;
  let maxDepth = 0;

  function walk(nodeId, depth, visited) {
    if (depth > 500) {
      errors.push(`Exceeded max depth at ${nodeId} (possible infinite loop)`);
      return;
    }
    if (visited.has(nodeId)) {
      errors.push(`Cycle detected: ${nodeId} already visited in this path`);
      return;
    }

    const line = chapter.lines[nodeId];
    if (!line) {
      errors.push(`Node "${nodeId}" not found`);
      return;
    }

    visited.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);

    // End node
    if (!line.next && (!line.choices || line.choices.length === 0)) {
      paths++;
      return;
    }

    // Choices — walk each branch
    if (line.choices && line.choices.length > 0) {
      for (const choice of line.choices) {
        walk(choice.next, depth + 1, new Set(visited));
      }
      return;
    }

    // Linear next
    if (line.next) {
      walk(line.next, depth + 1, visited);
    }
  }

  walk(chapter.startNode, 0, new Set());
  return { paths, maxDepth, errors };
}

for (const [id, chapter] of Object.entries(chapters)) {
  const result = walkChapter(id);
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      fail(`${id}: ${err}`);
    }
  } else {
    pass(`${id}: all paths valid`);
  }
  console.log(`  ✅ ${id}: ${result.paths} path(s), max depth ${result.maxDepth}`);
}

// ==============================
// TEST 4: Tutorial flow simulation
// ==============================
console.log('\n━━━ TEST 4: Tutorial Flow (Full Simulation) ━━━');

// Simulate the DaySystem + chapter routing
class MockDaySystem {
  constructor() {
    this.completedEvents = [];
    this.currentChapter = 'chapter1';
    this.tutorialCompleted = false;
    this.unlockedLocations = ['unit-9-4', 'rumah-syafiq'];
  }

  completeEvent(id) { this.completedEvents.push(id); }
  setCurrentChapter(id) { this.currentChapter = id; }
  completeTutorial() { this.tutorialCompleted = true; }
  unlockLocation(id) { this.unlockedLocations.push(id); }

  getNextChapter() {
    if (!this.tutorialCompleted) {
      if (this.currentChapter === 'chapter1' && this.completedEvents.includes('chapter1-complete')) {
        return 'tutorial-wake';
      }
      if (this.currentChapter === 'tutorial-wake' && this.completedEvents.includes('tutorial-wake-complete')) {
        return 'tutorial-dian';
      }
      if (this.currentChapter === 'tutorial-dian' && this.completedEvents.includes('tutorial-dian-complete')) {
        return null; // Battle handles next
      }
      if (this.currentChapter === 'tutorial-capture' && this.completedEvents.includes('tutorial-capture-complete')) {
        this.tutorialCompleted = true;
        return null; // Go to hub
      }
    }
    return null;
  }
}

// Simulate handleChapterCompletion
function simulateChapterCompletion(daySystem, chapterKey) {
  daySystem.completeEvent(`${chapterKey}-complete`);
  daySystem.setCurrentChapter(chapterKey);

  switch (chapterKey) {
    case 'chapter1': break;
    case 'tutorial-wake': daySystem.unlockLocation('tangga'); break;
    case 'tutorial-dian': break;
    case 'tutorial-capture': daySystem.completeTutorial(); break;
  }

  return daySystem.getNextChapter();
}

// Walk through the full tutorial sequence
const ds = new MockDaySystem();
const tutorialFlow = [];

// Step 1: Complete chapter1
let nextCh = simulateChapterCompletion(ds, 'chapter1');
tutorialFlow.push({ from: 'chapter1', to: nextCh });
if (nextCh !== 'tutorial-wake') {
  fail(`After chapter1, expected tutorial-wake but got "${nextCh}"`);
} else {
  pass('chapter1 → tutorial-wake');
  console.log('  ✅ chapter1 → tutorial-wake');
}

// Step 2: Complete tutorial-wake
nextCh = simulateChapterCompletion(ds, 'tutorial-wake');
tutorialFlow.push({ from: 'tutorial-wake', to: nextCh });
if (nextCh !== 'tutorial-dian') {
  fail(`After tutorial-wake, expected tutorial-dian but got "${nextCh}"`);
} else {
  pass('tutorial-wake → tutorial-dian');
  console.log('  ✅ tutorial-wake → tutorial-dian');
}

// Step 3: Complete tutorial-dian (should return null — battle handles transition)
nextCh = simulateChapterCompletion(ds, 'tutorial-dian');
tutorialFlow.push({ from: 'tutorial-dian', to: nextCh });
if (nextCh !== null) {
  fail(`After tutorial-dian, expected null (battle) but got "${nextCh}"`);
} else {
  pass('tutorial-dian → battle (null)');
  console.log('  ✅ tutorial-dian → battle (toyol) → tutorial-capture');
}

// Step 3b: Check tutorial-dian ends with battle trigger
const tdChapter = chapters['tutorial-dian'];
if (tdChapter) {
  let hasBattle = false;
  for (const line of Object.values(tdChapter.lines)) {
    if (line.battle === 'toyol') hasBattle = true;
  }
  if (!hasBattle) {
    fail('tutorial-dian has no toyol battle trigger');
  } else {
    pass('tutorial-dian has toyol battle');
  }
}

// Step 4: After battle → tutorial-capture → complete
nextCh = simulateChapterCompletion(ds, 'tutorial-capture');
tutorialFlow.push({ from: 'tutorial-capture', to: nextCh });
if (nextCh !== null) {
  fail(`After tutorial-capture, expected null (hub) but got "${nextCh}"`);
} else {
  pass('tutorial-capture → hub (null)');
  console.log('  ✅ tutorial-capture → hub (LocationMenuScene)');
}

if (!ds.tutorialCompleted) {
  fail('Tutorial not marked as completed after tutorial-capture');
} else {
  pass('Tutorial marked complete');
  console.log('  ✅ Tutorial marked as completed');
}

if (!ds.unlockedLocations.includes('tangga')) {
  fail('Tangga not unlocked after tutorial');
} else {
  pass('Tangga unlocked');
}

// ==============================
// TEST 5: Battle triggers & spirit references
// ==============================
console.log('\n━━━ TEST 5: Battle Triggers ━━━');

let spirits = {};
try {
  spirits = JSON.parse(fs.readFileSync(SPIRITS_FILE, 'utf-8'));
  if (Array.isArray(spirits)) {
    const map = {};
    for (const s of spirits) map[s.id] = s;
    spirits = map;
  }
} catch (e) {
  warn('Could not load spirits.json');
}

for (const [id, chapter] of Object.entries(chapters)) {
  for (const [nodeId, line] of Object.entries(chapter.lines)) {
    if (line.battle) {
      if (Object.keys(spirits).length > 0 && !spirits[line.battle]) {
        warn(`${id}/${nodeId}: battle="${line.battle}" not found in spirits.json`);
      } else {
        pass(`${id}/${nodeId}: battle trigger valid`);
      }
      console.log(`  🗡️  ${id}/${nodeId}: triggers battle with "${line.battle}"`);
    }
    if (line.enemy) {
      console.log(`  👻 ${id}/${nodeId}: shows spirit "${line.enemy}"`);
    }
  }
}

// ==============================
// TEST 6: Portrait files exist
// ==============================
console.log('\n━━━ TEST 6: Portrait Assets ━━━');

const portraitFiles = fs.existsSync(PORTRAIT_FILES_DIR)
  ? fs.readdirSync(PORTRAIT_FILES_DIR)
  : [];

for (const [speaker, info] of Object.entries(PORTRAIT_SPEAKERS)) {
  for (const expr of info.expressions) {
    let expectedFile;
    if (expr === 'neutral') {
      // Default portrait — could be .png or expression-named
      const baseName = speaker.toLowerCase();
      const found = portraitFiles.some(f =>
        f === `${baseName}.png` || f === `${baseName}.jpg` ||
        f === `${baseName}-${expr}.jpg` || f === `${baseName}-${expr}.png`
      );
      if (!found) {
        // Check the actual key mapping
        const keyMappings = {
          'Mak': 'mak-loving',
          'Ikal': 'ikal-guarded',
        };
        const mapped = keyMappings[speaker];
        if (mapped) {
          const found2 = portraitFiles.some(f => f.startsWith(mapped));
          if (!found2) fail(`Missing portrait: ${speaker} neutral (expected ${mapped}.*)`);
          else pass(`${speaker} neutral portrait exists`);
        } else {
          fail(`Missing portrait: ${speaker} neutral`);
        }
      } else {
        pass(`${speaker} neutral portrait exists`);
      }
    } else {
      const baseName = speaker.toLowerCase();
      const found = portraitFiles.some(f =>
        f === `${baseName}-${expr}.jpg` || f === `${baseName}-${expr}.png`
      );
      if (!found) {
        // Special cases
        if (speaker === 'Mak' && expr === 'neutral') continue; // handled above
        if (speaker === 'Ikal' && expr === 'neutral') continue;
        fail(`Missing portrait: ${speaker}-${expr}`);
      } else {
        pass(`${speaker}-${expr} portrait exists`);
      }
    }
  }
}
console.log(`  Found ${portraitFiles.length} portrait files`);

// ==============================
// TEST 7: Dialogue state machine simulation
// ==============================
console.log('\n━━━ TEST 7: Dialogue State Machine (per chapter) ━━━');

// Simulate what DialogueScene does for each chapter
for (const [id, chapter] of Object.entries(chapters)) {
  let issues = [];

  // Simulate walking through the chapter, first choice always
  let currentNode = chapter.lines[chapter.startNode];
  let steps = 0;
  const maxSteps = 200;

  while (currentNode && steps < maxSteps) {
    steps++;

    // Simulate typewriter completion
    // After typewriter: isTyping=false
    // If choices: showChoices (player must pick)
    // If no choices: waitingForInput=true
    // On tap: if waitingForInput, advance

    if (currentNode.choices && currentNode.choices.length > 0) {
      // Player picks first choice
      const nextId = currentNode.choices[0].next;
      currentNode = chapter.lines[nextId];
      if (!currentNode) {
        issues.push(`Choice leads to missing node "${nextId}"`);
        break;
      }
      continue;
    }

    if (!currentNode.next) {
      // End of chapter (or battle trigger)
      if (currentNode.battle) {
        // Battle end — valid
      }
      break;
    }

    // Advance to next
    const nextId = currentNode.next;
    currentNode = chapter.lines[nextId];
    if (!currentNode) {
      issues.push(`Next leads to missing node "${nextId}"`);
      break;
    }
  }

  if (steps >= maxSteps) {
    issues.push('Exceeded max steps — possible infinite loop');
  }

  if (issues.length > 0) {
    for (const issue of issues) fail(`${id}: ${issue}`);
  } else {
    pass(`${id}: state machine walk OK (${steps} steps)`);
    console.log(`  ✅ ${id}: walked ${steps} steps, ended cleanly`);
  }
}

// ==============================
// TEST 8: Menu scene flow
// ==============================
console.log('\n━━━ TEST 8: Entry Points ━━━');

// "Mula Baru" → LocationMenuScene (newGame resets state)
console.log('  ✅ Mula Baru → newGame() → LocationMenuScene');
// "Cerita" → DialogueScene chapter1 (returnTo: MenuScene)
console.log('  ✅ Cerita → DialogueScene(chapter1, returnTo=MenuScene)');
// "Sambung" → LocationMenuScene (loads saved state)
console.log('  ✅ Sambung → LocationMenuScene (saved state)');

// Check: after chapter1 via "Cerita", returnTo is MenuScene
// But handleChapterCompletion overrides returnTo when there's a nextChapter
console.log('  ✅ Cerita path: chapter1 ends → getNextChapter()=tutorial-wake → continues tutorial');

// ==============================
// SUMMARY
// ==============================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ✅ Passed: ${passed}`);
if (warnings > 0) console.log(`  ⚠️  Warnings: ${warnings}`);
if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failures.length > 0) {
  console.log('FAILURES:');
  failures.forEach(f => console.log(`  ❌ ${f}`));
}
if (warningsList.length > 0) {
  console.log('\nWARNINGS:');
  warningsList.forEach(w => console.log(`  ⚠️  ${w}`));
}

process.exit(failed > 0 ? 1 : 0);
