# Azershal Japanese — Business Fluency in 6 Months

A self-contained Japanese learning platform built for one goal: **understand & hold business conversations in Japanese in 6 months.**

No backend. No install. Just open `index.html`.

## Run
```
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```
All progress saves to your browser's localStorage. To move machines, use **Progress → Export state (JSON)**.

## The system (research-based)
- **SRS spaced repetition** (SM-2 algorithm) — the highest-evidence method for retention. Review cards right before you'd forget them.
- **6-month, 26-week curriculum** — 4 phases: 基礀 → 核心 → ビジネス → 応用.
- **Keigo-first business focus** — honorifics (尊敬/謙譲/丁寧) are the #1 differentiator in Japanese business. 12 core verb trios cover ~80% of workplace moments.
- **Daily routine ≈ 60–90 min**: SRS review → 10 new cards → 1 grammar point → keigo drill → 10 min shadowing → word of day.

## Tabs
| Tab | What it does |
|---|---|
| 📊 Dashboard | Today's status, streak, this week's plan, word of day, daily routine |
| 📅 Curriculum | 26-week roadmap with checkable weeks |
| 🔁 Review | SRS due cards — grade Again/Hard/Good/Easy |
| 🎴 Flashcards | Browse/learn by category (vocab, keigo, phrases) |
| ⭐ Word of Day | One high-leverage business word/day + archive |
| あ Kana | Hiragana/Katakana charts + quiz (no romanji by week 2) |
| 📐 Grammar | 39 points N5→N3, business-relevant, with examples |
| 🙇 Keigo | 3 layers + 12 verb trios + 8 common mistakes + phrase banks |
| ✏️ Quiz | 10-question self-tests per deck, scored & saved |
| 📦 Anki Export | Download TSV decks for Anki import |
| 📈 Progress | Mastery %, streak, deck breakdown, quiz history, checkpoints |

## Content volume
97 business vocab · 12 keigo verb trios · 5 keigo rules · 8 keigo mistakes · 63 phrases (email/meeting/phone/meishi) · 39 grammar points · 26-week plan · 30 word-of-day · full kana.

## Anki export
1. 📦 Anki Export tab → click a deck → downloads `azjp_*.txt`
2. Anki → File → Import → select the .txt
3. Separator: Tab. Fields: Front = col 1, Back = col 2 (+ Example col 3)
4. Recommended settings: 20 new/day, 200 max reviews, random order.

## External resources (free/cheap, recommended)
- **Grammar:** Bunpro (SRS), Tae Kim (free), Genki I & II
- **Kanji:** WaniKani
- **Listening:** NHK Web Easy, Nihongo con Teppei, JapanesePod101
- **Shadowing:** "Shadowing: Let's Speak Japanese" (business edition)
- **Speaking:** iTalki (tutors), HelloTalk (exchange)
- **Business:** BJT official practice tests, 敬語の教科書

## Self-assessment checkpoints
- Week 4: kana 90% (no romanji) + 40 vocab 80%
- Week 12: N5+N4 grammar 85% + 150 vocab
- Week 20: keigo trio quiz 80% + fluent 30-phrase roleplay
- Week 26: BJT-style mock (J2-ish) or JLPT N3 listening pass

## QA
Verified: JS syntax, content integrity (0 missing fields), SRS math (sane intervals, bounded ease), 11/11 routes render, all inline interactions (flip, grade, quiz, kana, toggle, export, reset, persistence) pass end-to-end in real browser script mode.