import 'dotenv/config'
import OpenAI from 'openai'
import { extractOutputText, sleep } from './shared.mjs'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function requestJson(url, body, attempt = 0) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    if (attempt < 3 && response.status >= 429) {
      await sleep(1500 * (attempt + 1))
      return requestJson(url, body, attempt + 1)
    }
    throw new Error(`OpenAI request failed (${response.status}): ${error}`)
  }

  return response.json()
}

export async function generateText({ model, system, user, verbosity = 'medium', reasoningEffort = 'medium' }) {
  const response = await requestJson('https://api.openai.com/v1/responses', {
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: system }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: user }],
      },
    ],
    text: {
      verbosity,
    },
    reasoning: {
      effort: reasoningEffort,
    },
  })

  const outputText = extractOutputText(response).trim()
  if (!outputText) throw new Error('OpenAI text response was empty')
  return {
    text: outputText,
    response,
  }
}

export async function generateJson({ model, system, user, verbosity = 'medium', reasoningEffort = 'medium' }) {
  const { text, response } = await generateText({
    model,
    system: `${system}\n\nReturn only valid JSON.`,
    user,
    verbosity,
    reasoningEffort,
  })

  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  const jsonText = jsonStart >= 0 && jsonEnd >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text

  return {
    json: JSON.parse(jsonText),
    response,
  }
}

export async function generateImage({ model, prompt, size, quality }) {
  return openai.images.generate({
    model,
    prompt,
    size,
    quality,
  })
}

export async function generateSpeech({ model, voice, input, instructions }) {
  return openai.audio.speech.create({
    model,
    voice,
    input,
    instructions,
  })
}
