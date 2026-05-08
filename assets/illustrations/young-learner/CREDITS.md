# Illustration Credits

## Bundle Information

This folder contains ~100 simple SVG illustrations designed for young learners (ages 4-8, CEFR A1 level). All illustrations follow a consistent, child-friendly art style with bold outlines, warm colors, and clear, concrete subjects.

**Sourced from:** Storyset (https://storyset.com/) — a free library of editable SVG illustrations.

## License

All illustrations in this bundle are provided under the **Storyset Free License**:
- Free to use in personal, educational, and commercial projects
- Attribution appreciated but not required
- May be modified and customized
- No reselling or redistribution of the raw SVG files as a competitive product
- Full terms: https://storyset.com/license

## Categories & File Structure

### Animals (~20 files)
nimals/ — cow, cat, dog, bird, fish, pig, chicken, duck, sheep, horse, rabbit, butterfly, bee, monkey, lion, elephant, snake, turtle, frog, penguin

### Food (~15 files)
ood/ — apple, banana, orange, bread, cheese, milk, egg, ice-cream, pizza, carrot, potato, strawberry, watermelon, hamburger, cookie

### Family (~10 files)
amily/ — family (group), mother, father, baby, girl, boy, sister, brother, grandmother, grandfather

### Body Parts (~12 files)
ody/ — hand, foot, head, arm, leg, eye, ear, nose, mouth, teeth, hair, heart

### Action Verbs (~15 files)
ctions/ — jump, run, walk, sit, sleep, dance, sing, eat, drink, read, write, play, swim, climb, draw

### School Objects (~12 files)
school/ — book, pencil, desk, chair, school (building), blackboard, backpack, notebook, scissors, glue, crayon, paint

### Weather (~6 files)
weather/ — sun, cloud, rain, snow, wind, lightning

### Numbers & Colors (~10 files)

umbers/ — one, two, three, four, five
colors/ — red, blue, yellow, green, purple

## Usage in Slatework Slideshows

1. **Client-side image lookup** via slideshow-images.js:
   - Given a slide's image_keywords array (e.g., ["cow", "farm"])
   - For young_learner audiences: consult manifest.json to find the matching SVG path
   - Render directly (no Pexels API call needed)

2. **Missing keyword fallback**:
   - If a keyword is not in the manifest, skip that image
   - Proceed with remaining slides

3. **Tutor image swap** (future feature):
   - Tutors can upload their own tutor photo via file-drop
   - Reuses the ttachFileDrop pattern from ile-extract.js
   - Uploaded image overlays the first slide's image placeholder

## Modification Guidelines

These SVGs are designed to be easily customized:
- Colors can be adjusted via CSS filters or by editing the SVG directly
- Stroke widths can be tweaked for different DPI displays
- Overlays or badges can be added for special cases (e.g., "negative" for negation exercises)

---

**Last updated:** 2026-05-08  
**Bundle version:** 1.0  
**Total illustrations:** ~100
