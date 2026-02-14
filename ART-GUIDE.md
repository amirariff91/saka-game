# SAKA — Art Guide & Production Plan

## Style Reference

All VN portraits follow a unified **semi-realistic anime** style — the sweet spot between manga expressiveness and painted realism. Think Persona 5 character art meets webtoon illustration.

### Existing Portraits (the benchmark)

| Character | BG Color | Particles | Clothing | Mood |
|-----------|----------|-----------|----------|------|
| **Syafiq** | Deep black + dark teal | Cyan/teal embers | Worn gray t-shirt, stained | Battle-worn, determined |
| **Dian** | Pure black | Purple/violet wisps | Lavender zip-up top | Calm, mysterious, contemplative |
| **Zafri** | Dark navy | Golden sparkles (from book) | Blue polo, wire-rim glasses | Scholarly, gentle smile |

### Style Rules

1. **Dark atmospheric backgrounds** — NOT transparent. Each character gets a mood-color backdrop with floating particles/energy matching their personality
2. **Character-coded colors:**
   - Syafiq → **teal/cyan** (saka energy, survival)
   - Dian → **purple/violet** (spirit hearing, intuition)
   - Zafri → **gold/amber** (knowledge, old manuscripts)
   - Ikal → **silver/white** (bunian, otherworldly)
   - Spirits → **red/crimson** (danger, supernatural)
   - Villains → **sickly green** or **deep crimson**
3. **Composition:** Bust/chest-up, slightly off-center gaze, 1024×1024px
4. **Lighting:** Dramatic rim light from particles, soft face illumination
5. **Skin tones:** Malaysian — warm medium to olive tones, realistic
6. **Age:** Teens look like real Malaysian teens, not anime-adult
7. **No background clutter** — particles/energy only, never scene elements

---

## Phase 1: Core Cast Expressions (PRIORITY)

Each main character needs **5 expression variants** for dialogue scenes. Same pose/outfit, different facial expressions.

### Syafiq (5 expressions)
| # | Expression | Use Case |
|---|-----------|----------|
| 1 | ✅ **Neutral/determined** | Default (DONE — current portrait) |
| 2 | **Shocked/scared** | Spirit encounters, jump scares |
| 3 | **Angry/intense** | Battle, confrontations |
| 4 | **Sad/exhausted** | Saka drain, emotional moments |
| 5 | **Smirking/dry humor** | Banter with Dian/Zafri |

### Dian (5 expressions)
| # | Expression | Use Case |
|---|-----------|----------|
| 1 | ✅ **Calm/contemplative** | Default (DONE) |
| 2 | **Worried/concerned** | Sensing spirits, warnings |
| 3 | **Happy/warm smile** | Bonding moments, trust |
| 4 | **Angry/frustrated** | Being dismissed, fighting |
| 5 | **Frightened/covering ears** | Overwhelmed by spirit voices |

### Zafri (5 expressions)
| # | Expression | Use Case |
|---|-----------|----------|
| 1 | ✅ **Gentle smile (book)** | Default (DONE) |
| 2 | **Excited/eureka** | Discovering lore connections |
| 3 | **Nervous/uncertain** | Danger without spiritual power |
| 4 | **Serious/explaining** | Lore dumps, teaching Syafiq |
| 5 | **Frustrated/self-doubt** | Can't see/sense spirits like others |

### Mak (Syafiq's mother — 3 expressions)
| # | Expression | Use Case |
|---|-----------|----------|
| 1 | **Tired but loving** | Default — worn out single mum |
| 2 | **Worried/concerned** | Syafiq coming home late/hurt |
| 3 | **Stern/angry** | Catching Syafiq in trouble |

**Style notes:** Older, tired eyes, wears baju kurung or house clothes, hair in loose ponytail. BG color: warm amber/orange (home, family).

### Ikal (3 expressions)
| # | Expression | Use Case |
|---|-----------|----------|
| 1 | **Guarded/cool** | Default — doesn't trust easily |
| 2 | **Knowing smirk** | Revealing bunian knowledge |
| 3 | **Serious/warning** | Danger from spirit politics |

**Style notes:** Androgynous beauty (half-bunian), slightly too-perfect features, long dark hair. BG color: silver/white mist with moonlight particles.

**Phase 1 total: 19 portraits** (16 new + 3 existing)

---

## Phase 2: Spirit Portraits

For dialogue scenes where spirits speak (pre-battle, story moments). Different treatment from human characters.

### Style Rules for Spirits
- **Darker, more chaotic backgrounds** — red/black with distortion
- **Semi-transparent/ghostly edges** — character fades into particles at edges
- **Glowing eyes** — piercing, unnatural colors
- **Same 1024×1024** size, same composition
- Can be more stylized/painterly than human characters

### Priority Spirits (5 portraits)
| Spirit | Look | Use Case |
|--------|------|----------|
| **Toyol** | Child-like, green-tinged skin, huge dark eyes, mischievous grin | Tutorial battle, recurring trickster |
| **Pontianak** | Beautiful woman, long black hair, white dress, terrifying smile | Major Arc 1 encounter |
| **Penanggal** | Woman's head with hanging organs, ethereal beauty above, horror below | Boss encounter |
| **Hantu Raya** | Massive dark figure, barely visible features, overwhelming presence | Mid-game power check |
| **Sang Gerhana** | Abstract/cosmic, eclipsed face, ancient beyond description | End-game teaser only |

---

## Phase 3: Scene Backgrounds (5 key locations)

Painted backgrounds (1920×1080 or 1280×720, will be scaled). Replace the current flat dark fills.

| # | Scene | Mood | Key Elements |
|---|-------|------|-------------|
| 1 | **PPR Corridor** | Claustrophobic, flickering light | Long concrete hallway, numbered doors, single fluorescent tube, graffiti |
| 2 | **Syafiq's Room** | Cramped but lived-in | Small bed, school bag, old fan, window with KL skyline |
| 3 | **PPR Rooftop** | Open sky, freedom + danger | Water tanks, city lights below, night sky, clothes lines |
| 4 | **PPR Stairwell** | Dark, vertical, echo-y | Concrete stairs, trash, single dim light from above |
| 5 | **Unit 9-4** | Abandoned, supernatural | Dusty room, old bottles on shelves, Jawi inscriptions, green glow |

### Background Style Rules
- Dark, moody, painterly
- No characters in backgrounds (portraits overlay them)
- Color palette: desaturated except for one accent color per scene
- Resolution: 1280×720 minimum (landscape, fills screen behind portrait)

---

## Phase 4: UI Polish

### Dialogue Box
- Current: teal-bordered dark box — **keep**, it works
- Add: character name plate with colored accent matching speaker's theme color
- Consider: slight frosted glass effect for modern feel

### Battle UI
- HP/Saka bars — cleaner design, maybe with Jawi-inspired decorative edges
- Action buttons — consistent with teal accent, more satisfying hover/press states
- Spirit portrait in battle — larger, more dramatic framing

### Menu / Hub
- Location menu icons — simple but evocative silhouettes
- Day/time indicator — cleaner typography
- Quest tracker — less intrusive, pulls from teal accent

---

## Generation Pipeline

### Tool Selection

**For character portraits:** Need an API that can:
1. Generate consistent anime/semi-realistic style
2. Maintain character identity across expressions
3. Produce dark atmospheric backgrounds with particles
4. Handle Malaysian features accurately

**Candidates (ranked):**

| Tool | Pros | Cons | Cost |
|------|------|------|------|
| **Flux Pro (via Replicate/fal.ai)** | Open weights, high quality, great at anime, API available | Need careful prompting for consistency | ~$0.03-0.05/image |
| **Stability AI (SDXL/SD3)** | Well-documented API, ControlNet for consistency | Can struggle with non-Western faces | ~$0.02-0.04/image |
| **NovelAI** | Purpose-built for anime/VN art, excellent consistency | Subscription ($25/mo), limited API | $25/mo |
| **Midjourney** | Highest overall quality | No real API, manual process | $10/mo |

**Recommended: Flux Pro via fal.ai or Replicate**
- API-driven (we can script batch generation)
- Excellent anime/semi-realistic output
- Character consistency via detailed reference prompts
- ~$1-2 total for all 19 portraits

### Consistency Strategy

To keep characters looking the same across expressions:
1. **Base prompt** with detailed physical description (locked per character)
2. **Style suffix** with art direction (same across all characters)
3. **Expression modifier** (only thing that changes between variants)
4. **img2img/reference** — use the existing portrait as style anchor where possible

### Prompt Template
```
[CHARACTER_DESC], [EXPRESSION], semi-realistic anime illustration,
dark atmospheric background with [COLOR] floating particles,
dramatic rim lighting, bust portrait, 1024x1024,
visual novel character art, detailed shading, clean linework,
dark moody backdrop, [PARTICLE_DESC]
```

---

## Production Schedule

| Phase | Deliverables | Est. Time | Est. Cost |
|-------|-------------|-----------|-----------|
| **Phase 1** | 16 new character portraits | 1-2 sessions | ~$1-2 |
| **Phase 2** | 5 spirit portraits | 1 session | ~$0.50 |
| **Phase 3** | 5 scene backgrounds | 1-2 sessions | ~$1-2 |
| **Phase 4** | UI polish (code only) | 1 session | Free |
| **Total** | 26 new images + code | 4-5 sessions | ~$3-5 |

---

## Integration Plan

### DialogueScene Changes
```typescript
// Expression system — extend speakerSpriteMap
private readonly speakerSpriteMap: Record<string, {
  key: string;
  side: 'left' | 'right';
  expressions: Record<string, string>; // emotion → texture key
}> = {
  'Syafiq': {
    key: 'portrait-syafiq',
    side: 'left',
    expressions: {
      neutral: 'portrait-syafiq',
      shocked: 'portrait-syafiq-shocked',
      angry: 'portrait-syafiq-angry',
      sad: 'portrait-syafiq-sad',
      smirk: 'portrait-syafiq-smirk',
    }
  },
  // ...
};
```

### Chapter JSON Changes
```json
{
  "speaker": "Syafiq",
  "expression": "shocked",
  "text": "Apa... apa benda tu?"
}
```

### Background System
```typescript
// Load painted backgrounds as images instead of procedural generation
this.load.image('bg-ppr-corridor', 'assets/backgrounds/ppr-corridor.jpg');
this.load.image('bg-rooftop', 'assets/backgrounds/rooftop.jpg');
// ...

// In DialogueScene, background swap:
private updateBackground(bgKey: string): void {
  this.backgroundImage.setTexture(bgKey);
}
```

---

## Files
- Portraits: `public/assets/portraits/[character]-[expression].png`
- Backgrounds: `public/assets/backgrounds/[location].jpg`
- Spirit portraits: `public/assets/portraits/spirits/[spirit].png`

---

*Last updated: 2026-02-14*
