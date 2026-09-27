# Art plans

Everything needed to illustrate a set of story texts without further input. Each plan says which pictures to make, where they go in the text, and what their captions and alt texts are. A runner turns the plans into images overnight.

```
pipeline/art/<set>/style.json          art direction, model, sizes, rules, prices
pipeline/art/<set>/stories/<id>.json   one plan per story: world, cast, places, cover, pictures
pipeline/commands/generate-art.mjs     the runner (npm run art:generate)
pipeline/commands/art-paragraphs.mjs   numbered paragraphs for writing plans (npm run art:paragraphs)
```

The first set is `child-friendly`: the 34 kids' versions, in one Scandinavian picture-book style.

## How the pictures stay consistent

1. **Style reference.** One painting that fixes the technique (gouache and watercolour, pencil lines, paper texture). It is sent with every model sheet and place picture.
2. **Model sheets.** Each character gets a sheet with three views on plain paper. Every picture with that character sends the sheet along as a reference image, with the instruction to keep face, hair, build and clothes.
3. **Place pictures.** Locations that recur (the troll's cave, the royal farm) get a reference painting that is sent with the pictures set there.
4. **Text.** Every prompt also repeats the character descriptions, the story world, the story's palette and the art style.

Characters are designed per tale. Askeladden, kings, princesses and trolls look different in every tale, and each tale has its own season, light and colours. The dry run warns when two characters in different tales are described alike.

## Running it

You need Node 20 or newer, `npm install`, and `OPENAI_API_KEY=...` in a `.env` file in the project folder. The runner calls the OpenAI API directly.

```bash
npm run art:generate -- --dry-run                 # check every plan, count images, estimate the cost
npm run art:generate -- --story=askesv            # one tale (28 images, about $5): check the look first
npm run art:generate -- --budget=150              # everything that is missing, stopping at about $150
```

- Finished images are skipped, so you can stop with Ctrl+C and start again, and a second run retries only what failed.
- `--budget=USD` stops starting new images once the estimated spend reaches the amount.
- `--concurrency=N` sets how many images are made at once (default 3). Raise it if your OpenAI tier allows more images per minute.
- The run stops by itself if the key is rejected, the account runs out of credit, the model is not available, or 8 images in a row fail.

Other options:

| Option                           | Meaning                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `--story=askesv,giske`           | only these tales                                                                   |
| `--only=characters,places`       | only these kinds: `style`, `characters`, `places`, `portraits`, `covers`, `scenes` |
| `--ids=03,07`                    | only these picture ids or character/place slugs                                    |
| `--force`                        | make the selected images again, even if they exist                                 |
| `--quality=medium`               | `low`, `medium`, `high`, `xhigh`, `max` (default in `style.json`: `high`)          |
| `--model=gpt-image-2.5-sunburst` | another image model (default `gpt-image-2.5-flare`)                                |
| `--limit=N`                      | at most N images this run                                                          |
| `--verbose`                      | print every prompt (use with `--dry-run` to read them before paying)               |

To redo pictures you don't like, change the plan if needed and run for example `npm run art:generate -- --story=askesv --only=scenes --ids=03,07 --force`. If you redo a model sheet, redo the pictures with that character too.

`style.json` can pass extra API parameters in `extraParams`, for example `"moderation": "low"` if too many harmless pictures are blocked.

### Cost

The API charges per token: $8 per million tokens for reference images going in, and $30 per million for image tokens coming out. A 1536×1024 picture at `high` is about $0.08 of output, and every reference image sent along adds roughly $0.05. That makes a scene with three characters and a place about $0.25. The estimate in the dry run uses these numbers.

Every image's real token use is logged in `run-log.jsonl`. At the end of a run, the runner prints what it spent and how many tokens a reference image really costs. Run one tale first and use that figure to set `--budget`.

## Output

Everything goes to `pipeline/art-output/<set>/`:

```
_style/style.webp                   the style reference
<story>/characters/<slug>.webp      model sheets
<story>/portraits/<slug>.webp       portraits for the character gallery
<story>/places/<slug>.webp          place references
<story>/cover.webp                  the cover (square)
<story>/scenes/01.webp ...          the pictures in reading order
<story>/illustrations.json          everything the reader needs (below)
review.html                         all pictures next to their paragraph, caption and prompt
run-log.jsonl                       one line per image: time, cost, tokens, errors
```

Each image has a `.prompt.txt` next to it with the exact prompt that made it. Open `review.html` in a browser to check the pictures against the text.

`illustrations.json` has the cover, the characters (name, description, sheet, portrait, and the old portrait each one replaces), the places, and the pictures: `paragraph` (0-based index into `story.txt`, split on blank lines; the picture belongs directly after that paragraph), `anchor` (the start of that paragraph, to find it again if the text changes), `file`, `caption`, `alt`, `prompt` (the short scene description, for showing to readers) and `fullPrompt` (everything that was sent).

## Writing a plan

Print the text with paragraph numbers first:

```bash
npm run art:paragraphs -- --story=askesv
```

Use `stories/askesv.json` as the model. Check the plan with `npm run art:generate -- --dry-run --story=<id>` until it has no problems and no warnings.

### Fields

| Field                          | Language | What it is                                                                                                                                  |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `storyId`, `title`, `textFile` |          | the tale, its title without "(barnevennlig)", and the text the pictures belong to                                                           |
| `world`                        | English  | 60–150 words: where and when, the named locations, and the exact look and size of recurring objects (the harp, the trough, the magic cloth) |
| `palette`                      | English  | this tale's season, weather, time of day and colour accents, different from the other tales                                                 |
| `cast[]`                       |          | the characters who get a model sheet and a portrait                                                                                         |
| `places[]`                     |          | 0–3 locations that recur in three or more pictures                                                                                          |
| `cover`                        |          | `prompt`, `characters`, `places`, `caption`, `alt`                                                                                          |
| `illustrations[]`              |          | `id` ("01", "02", …), `paragraph`, `anchor`, `characters`, `places`, `prompt`, `caption`, `alt`                                             |

Cast entries:

- `slug`: lowercase with dashes. `name` and `description`: Norwegian, shown in the app. Take them from the variant's `characters.json` when the character is there, and set `replacesPortrait` to that slug.
- `promptName`: the English name used in prompts, such as "Askeladden", "the King", "the Princess" or "the Troll's Daughter". It must be unique in the tale. Avoid names the image model misreads: "Snow-White and Rose-Red" becomes two girls, so call her "the Maiden".
- `look`: English, 50–90 words: age, build, height, face shape, nose, eyes, hair colour and style, facial hair, clothes with colours, and one signature item. For trolls and animals: size, colours, fur or skin, and distinctive features. Specific enough that an illustrator draws the same character every time.
- `portrait` (optional): a background hint for the portrait, such as "Background: the firelit Cave Hall."
- A character whose look changes (a frog that becomes a prince, a goose girl who becomes a queen, a boy in disguise) gets one cast entry per look, for example `vesle-aase` and `vesle-aase-queen`.

Places: `slug`, `name` (English, capitalised like a proper name: "the Grey Mountain", used in prompts), and `look` (40–90 words).

### Choosing the pictures

- Aim for about one picture per 120–170 words: at least 2 for the shortest tales and at most 28 for the longest. Spread them evenly through the text.
- Pick what a child wants to see: the setup, every turn of the plot, the funniest and most magical moments, and the ending.
- `paragraph` is the number from `art:paragraphs`. The picture is shown right after that paragraph, so choose the paragraph where the moment happens. `anchor` is the first sentence (or first words) of that paragraph, copied exactly.
- Show only what the text says: the right number of people, animals and things, the right time of day, and who is there and what they hold.

### Prompts

- English, 50–110 words, one moment: who is where in the frame, what they do, their expressions, the key props with exact numbers, the setting and the light. Say how wide the view is when it matters.
- Name every cast member in the picture by their `promptName`, keeping its capitals ("the King", not "the king"). Words may come between "the" and the name ("the enormous Troll Guardian"). List them all in `characters`. The checker requires this, and it sends only the sheets of listed characters.
- Don't repeat the characters' looks; they are added automatically. Only mention what is different in this moment (soaking wet, wearing the troll's shawl, a crown on).
- Don't mention art style, medium or "picture book"; those are added automatically too.
- Minor figures that are not in the cast (guards, guests, a crowd) are described in the prompt, with exact numbers.
- No text in pictures, so never ask for signs, letters, books with writing or banners.
- Safe for small children: show dangerous moments just before or after, and funny rather than frightening. No weapons in use, no injuries, no dead bodies. When the text has a death, show it gently, such as a pile of stones and moss where the troll stood.

### Captions and alt texts

Norwegian bokmål, in the voice of the kids' text.

- `caption`: one short line under the picture, at most about 90 characters (the hard limit is 140). It may quote the text. Don't give away what happens next.
- `alt`: one or two sentences describing what the picture shows, for screen readers (at most 300 characters).
