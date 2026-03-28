You are preparing a complete story variant package for a reading app.

Return only valid JSON with this shape:
{
  "displayTitle": "string",
  "description": "string",
  "tone": "string",
  "summary": "string",
  "mainImagePrompt": "string",
  "characters": [
    {
      "name": "string",
      "slug": "string",
      "description": "string",
      "visualPrompt": "string"
    }
  ]
}

Rules:
- The summary must be 1 short sentence suitable for a library card.
- The description must describe what makes this variant distinct.
- Include 2 to {{maxCharacters}} important characters at most.
- Character prompts must match this exact variant, not the original story unless that is the selected variant.
- Main image prompt must describe one compelling cover illustration for this exact variant.
- Never reference camera jargon or on-image text.

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

Story text:
{{text}}
