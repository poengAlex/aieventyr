You are preparing scene illustration prompts for a fairytale reading app.

Return only valid JSON with this shape:
{
  "sections": [
    {
      "id": "section-1",
      "title": "string",
      "imagePrompt": "string"
    }
  ]
}

Rules:
- Return exactly one entry for each provided section id.
- Each imagePrompt must describe a different visual moment from that section.
- Keep the prompts faithful to the selected story variant, not the source version.
- Reuse the provided character descriptions so the cast stays visually consistent.
- Use vivid visual language with one clear focal action.
- Do not mention camera jargon, lenses, aspect ratios, or on-image text.
- Do not describe multiple unrelated moments in one prompt.
- Titles should be short and readable.

Story id:
{{storyId}}

Original title:
{{originalTitle}}

Variant:
{{variant}}

Variant label:
{{variantLabel}}

Variant explanation:
{{variantExplanation}}

Variant description:
{{variantDescription}}

Characters:
{{characters}}

Sections:
{{sections}}
