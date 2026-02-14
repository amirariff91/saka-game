# SAKA — Game Redesign: Big Picture

## The Problem

Playing SAKA right now feels **lost**. Here's why:

1. **No guidance** — After Chapter 1's great intro, you land on a hub menu with location cards and zero clue what to do next
2. **Hub is a dead menu** — Just text cards on a dark screen. No characters, no atmosphere, no life
3. **No objectives** — No quest log, no markers, no "next step" indicator
4. **Saka hunger = mystery bar** — A bar labelled "SAKA" that drains with no context given to the player
5. **Time system means nothing** — Pagi/Petang/Malam advances but doesn't change anything meaningful
6. **Battles appear randomly** — You click a location, read dialogue, suddenly you're in combat with no stakes explained
7. **No progression feel** — No XP, no levels, no visible growth, no "I'm getting stronger"

**The content is great** — 20 spirits with deep lore, atmospheric dialogue in BM, brilliant world rules. But the **game design glue** that makes a player want to keep tapping is missing.

---

## The Fix: Persona 5 Lite

Reference games: **Persona 5** (daily life + dungeon), **Mob Psycho 100** (tone), **Night in the Woods** (hub exploration)

### Core Loop (What You Do Every Day)

```
┌─────────────────────────────────────────┐
│           MORNING / EVENING             │
│                                         │
│  1. Wake up → Brief scene/notification  │
│  2. Hub: PPR Building (visual, alive)   │
│  3. Pick activity (2-3 per time slot):  │
│     • Story mission (🔴 main quest)     │
│     • Hang out with friend (+bond)      │
│     • Explore location (find items)     │
│     • Train/Rest (recover saka)         │
│  4. Activity plays out (dialogue/battle)│
│  5. Time advances → new slot or sleep   │
│                                         │
│           NIGHT (MALAM)                 │
│                                         │
│  6. Spirit activity peaks               │
│  7. Mandatory encounter OR hunt choice  │
│  8. Battle / capture / flee             │
│  9. Return home → day summary           │
│  10. Save → next day                    │
└─────────────────────────────────────────┘
```

### What Changes

#### 1. GUIDED OPENING (Tutorial Flow)
**Current:** Chapter 1 dialogue → dumped at hub
**New:**

```
Chapter 1 (unchanged — it's great)
    ↓
Wake up next morning → brief scene with Mak
    ↓
"Go to school" → but weird things happen on the way
    ↓
Meet Dian on the stairwell (forced encounter — introduces hearing)
    ↓
First spirit sighting → game teaches "you can SEE now"
    ↓
Saka bar appears with explanation: "Benda dalam kau tu... lapar."
    ↓
First battle (tutorial) — simple Toyol, teaches attack/defend/capture
    ↓
Capture Toyol → game teaches Bayang system
    ↓
NOW you reach the hub — but with context and a clear next objective
```

**Day 1 is fully scripted. No choices. Teach the game.**

#### 2. LIVING HUB (Replace Dead Menu)

**Current:** Dark screen with text cards
**New:** Visual PPR building cross-section (think: fallout shelter / tiny tower style)

```
┌────────────────────────────────────┐
│  ☁️ ROOFTOP (locked, day 5+)       │
│  ═══════════════════════════════   │
│  🏚️ UNIT 9-4 (the bottle room)    │
│  ───────────────────────────────   │
│  👧 DIAN'S UNIT (social)           │
│  ───────────────────────────────   │
│  🏠 SYAFIQ'S UNIT (rest/save)     │
│  ═══════════════════════════════   │
│  🪜 STAIRWELL (random encounters)  │
│  ═══════════════════════════════   │
│  🏪 KEDAI RUNCIT (items/info)      │
│  ═══════════════════════════════   │
│  🌳 TAMAN (Zafri hangout, day 3+)  │
│  ───────────────────────────────   │
│                                    │
│  [Time: Hari 3 — Petang 🌅]       │
│  [Saka: ████████░░ 80%]           │
│  [Spirits: 🫙🫙🫙 3 captured]      │
│  [Quest: Cari Zafri di taman]      │
└────────────────────────────────────┘
```

**Key improvements:**
- **Visual building** — pixel art cross-section of PPR, not text cards
- **Characters visible** — Dian standing at her floor, Zafri waving from taman
- **Active quest shown** — bottom bar always shows current objective
- **NPC dots** — small indicators showing who's where
- **Locked floors** are visible but greyed out (teases progression)
- Tap a floor → zoom in → interact

#### 3. QUEST/OBJECTIVE SYSTEM

Always show the player what to do next. Simple, one active quest at a time.

```typescript
interface Quest {
  id: string;
  title: string;        // "Cari Dian"
  description: string;  // "Dian selalu nampak kat tangga petang-petang"
  location: string;     // Which hub location highlights
  type: 'main' | 'side' | 'hunt';
  isComplete: boolean;
}
```

**Quest flow for Arc 1:**
1. ~~Discover Unit 9-4~~ (Chapter 1 — auto)
2. 🔴 "Benda pelik berlaku" — Meet Dian at stairwell
3. 🔴 "Saka lapar" — First battle tutorial
4. 🔴 "Cari jawapan" — Find Zafri (he has books about spirits)
5. 🔴 "Tangkap 3 spirits" — Hunt quest (unlocks new bayang)
6. 🔴 "Unit 9-4 lagi" — Return to bottle room (story progresses)
7. 🔵 Side: "Tolong Mak Cik tingkat 5" — Toyol causing trouble
8. 🔴 "Rooftop showdown" — Arc 1 boss

The quest title appears:
- On the hub screen (bottom bar)
- As a subtle glow on the relevant location
- In a quest log accessible from pause menu

#### 4. SAKA SYSTEM — MAKE IT FEEL REAL

**Current:** Silent draining bar
**New:** The Saka talks to you

The Saka isn't just a hunger bar — it's a CHARACTER. It whispers. It comments. It gets angry.

```
Saka at 80%+: Silent. Satisfied.
Saka at 50-80%: Occasional whisper during dialogue
  → "Lapar..." (text flickers at screen edge)
Saka at 30-50%: Screen edges get dark. Whispers more frequent.
  → "Bagi makan..." / "Tangkap lagi..."
Saka at <30%: Screen pulses red. Choices get interrupted.
  → Saka SPEAKS over Syafiq's dialogue
  → Battle power increases but HP drains
Saka at 0%: BLACKOUT scene. Wake up somewhere else. Time skips. Something bad happened.
```

**How to feed Saka:**
- Capture a spirit (+30 saka)
- Channel a spirit's energy (+15 saka, but spirit weakens)
- Rest at home (+10 saka, costs time slot)
- Eat at kedai runcit (+5 saka, costs RM)

This makes saka management THE GAME. You're always balancing:
- Hunt spirits to feed saka (but battles cost HP)
- Rest to recover (but lose time for quests)
- Channel spirits (but they get weaker for future battles)

#### 5. TIME MATTERS

**Current:** Pagi/Petang/Malam, nothing changes
**New:** Different things happen at different times

| Time | What Changes |
|------|-------------|
| **Pagi** | School (skip), NPCs active, safe, no spirits outdoors |
| **Petang** | Free time, friends available, weak spirits start appearing |
| **Malam** | Spirits everywhere, strong encounters, but best loot/captures |

- **3 time slots per day, 2 actions per slot** (Persona style)
- Story missions take 1 action
- Social hangouts take 1 action
- Hunting takes 1 action
- Rest takes 1 action (but can do at any time)

**Urgency:** Main quests have soft deadlines. "Sebelum bulan penuh" = you have X days. Miss it → story consequence (not game over, but different path).

#### 6. SOCIAL BONDS (Simplified Confidants)

Hanging out with Dian/Zafri/Ikal unlocks abilities:

| Character | Bond Level | Unlock |
|-----------|-----------|--------|
| **Dian** | ♥ 1 | She warns you before ambush encounters |
| **Dian** | ♥ 3 | She can identify spirit weaknesses by sound |
| **Dian** | ♥ 5 | She can calm spirits (reduce capture difficulty) |
| **Zafri** | ♥ 1 | He teaches bottle-making (carry +1 bottle) |
| **Zafri** | ♥ 3 | He identifies spirit types before battle |
| **Zafri** | ♥ 5 | He upgrades bottles (glass → clay → metal) |

Social scenes are short (3-5 dialogue exchanges) but reveal character depth. They feel earned, not grind-y.

#### 7. BATTLE IMPROVEMENTS

**Current problems:**
- No strategy beyond "attack until dead"
- Capture mechanic unclear (need <25% HP)
- Bayang system barely functional
- No post-battle reward screen

**Fixes:**

**a) Pre-battle intel:**
Before each fight, show a card:
```
┌──────────────────────────────┐
│  👻 PENANGGAL                │
│  "Mak P"                    │
│  HP: ████████ Tinggi         │
│  Kelemahan: Jeruk nipis      │
│  Tier: Uncommon              │
│                              │
│  ⚠️ Bahaya: Serangan terbang │
│                              │
│  [Lawan]    [Lari]           │
└──────────────────────────────┘
```

**b) Rock-paper-scissors element:**
- Physical attacks → strong vs familiars, weak vs djinn
- Bayang attacks → strong vs hantu, weak vs jembalang  
- Spirit-type attacks → elemental matchups

**c) Capture clarity:**
- Show capture % on screen when enemy HP is low
- Bottle icon glows when capture is possible
- Different bottles for different tiers (visual cue)

**d) Post-battle reward:**
```
┌──────────────────────────────┐
│  ✨ BERJAYA!                  │
│                              │
│  Ditangkap: Toyol 🫙         │
│  Saka: +30 ████████████      │
│  Bayang baru: Shadow Step    │
│  Botol tinggal: 2            │
│                              │
│  [Teruskan]                  │
└──────────────────────────────┘
```

#### 8. MAP SCREEN (Replaces Location Cards — Phase 2)

When the game expands beyond PPR (Arc 1 end), show a map of KL:
- PPR Sri Kerinchi (home)
- Kampung Baru (langsuir territory)
- Cheras cemetery (hantu kubur)
- Batu Caves area (jembalang tanah)
- KL Tower area (hantu tinggi)

But for now (Arc 1), the PPR building cross-section IS the map.

---

## Implementation Priority

### Phase 1: Core Loop Fix (Make it playable)
1. **Quest system** — Always show what to do next
2. **Tutorial day** — Guided Day 1 after Chapter 1
3. **Post-battle rewards** — Feel good after winning
4. **Saka personality** — Whispers and visual effects at low hunger

### Phase 2: Living Hub (Make it feel alive)
5. **Visual PPR hub** — Cross-section building (can use tilesets we already have)
6. **NPC placement** — Characters visible on their floors
7. **Time-of-day visuals** — Hub changes color by pagi/petang/malam

### Phase 3: Depth (Make it strategic)  
8. **Social bonds** — Dian & Zafri hangout scenes + unlocks
9. **Battle type matchups** — Strategic combat
10. **Spirit collection screen** — Bestiary with lore (reward for catching)

### Phase 4: Polish
11. **Pre-battle intel cards**
12. **Capture probability display**
13. **Day summary screen**
14. **Saka blackout scenes**

---

## What We Already Have (Assets)

✅ 20 spirits with full stats, lore, bayang abilities
✅ 8 spirit pixel art sprites (+ 12 processing)
✅ 3 player character sprites (Syafiq, Dian, Zafri)
✅ 2+ tilesets (PPR corridor, + rooftop & apartment pending)
✅ 8 SFX
✅ Full story bible (3 arcs)
✅ Chapter 1 dialogue (excellent)
✅ Battle scene (functional)
✅ Dialogue engine with choices
✅ Day system (needs enhancement)
✅ Saka system (needs personality)

What we're missing is the **connective tissue** — the quest system, the visual hub, the guided flow, and the reward loops that keep a player engaged.

---

## One Sentence Summary

**SAKA has the soul of a great game. It just needs a spine.**

The content, lore, and atmosphere are genuinely good. What's missing is game design fundamentals: tell the player what to do, show them they're progressing, and make every action feel meaningful.
