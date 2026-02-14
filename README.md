# SAKA

**Malaysian supernatural visual novel + tactical combat game.**

*Yang dilupa masih ada.* — The forgotten still exist.

A cursed teenager catches ghosts into bottles to survive — and uncovers a conspiracy breaking ancient seals across Malaysia. Pokémon meets Malaysian folklore, set in the urban poor reality of KL.

## Tech Stack

- **Phaser 3** — Game engine
- **TypeScript** — Strict mode
- **Vite** — Build tooling
- **Docker + nginx** — Deployment

## Development

```bash
npm install
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
```

## Docker

```bash
docker build -t saka-game .
docker run -p 8080:80 saka-game
```

## Project Structure

- `src/scenes/` — Phaser scenes (Menu, Dialogue, Explore, Battle, Inventory)
- `src/systems/` — Core systems (DialogueEngine, SakaSystem, TypewriterEffect)
- `src/data/` — Game data (chapter scripts, spirit roster)
- `src/assets/` — Art assets (placeholder for PixelLab-generated sprites)

## Arc 1: The Awakening

Episode 1 "Bau" — Syafiq rides home from his mamak shift at 2am. On the 9th floor of his PPR flat, he smells frangipani where no flowers grow. A door is ajar. Inside: dozens of sealed bottles. One is cracked.

What you forget doesn't disappear. It waits.

---

*Built for the SAKA universe. All lore, characters, and story © Amir Ariff.*
