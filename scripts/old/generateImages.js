import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import path from 'path'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateTheme(cleanedText) {
  const prompt = `
    Based on the following text, generate a image style description.
    Here is some help from the internet:


cell shading, soft shading, realistic shading, stippling
clean linework, bold linework, inked lines
vibrant palette, muted palette, pastel colors
smooth textures, brush stroke textures, patterned textures
stylized proportions, realistic proportions, heroic proportions, exaggerated features
dramatic lighting, high contrast, atmospheric lighting
I personally found that my favorites (that I used for these examples) are gradient shading, clean linework, vibrant palette, and stylized proportions.

    Be concise and in plain JSON format, e.g., { "theme": "A detailed description of the theme" }.
    Text:
    ${cleanedText}
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant specializing in generating consistent themes for image generation.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_object',
    },
  })

  const res = JSON.parse(chatCompletion.choices[0].message.content)
  return res.theme
}

async function generateCharacterDescription(cleanedText, imageArray) {
  const prompt = `
    Based on the following text and the array of images to be generated, describe the main characters in detail to ensure consistent and accurate image generation. Include details such as:
    - Physical appearance (e.g., height, build, hair, facial features, clothing)
    - Setting or context (e.g., environment, associated objects)
    - Ensure that character names are exactly as they appear in the image array.

    Use the provided array of images to make sure character descriptions match the context of each image.

    Keep it short!

    Text:
    ${cleanedText}

    Array of images:
    ${JSON.stringify(imageArray)}

    Return the descriptions in plain JSON format like:
    { "characters": [{ "name": "Character Name", "description": "Detailed character description" }] }
    DO NOT add anything else like an intro!
    NB! Character names must be in Norwegian and like described in the description in the array of images
    Reply in Norwegian.

    Here are some tips from the internet on how to generate character descriptions:
    Generate images using this exact template:
Digital painting of a distinctly feminine green-eyed, white-furred tabaxi monk (with fluffy cheeks and a tuft on her head) with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing a simple green monk tunic and carrying a pack, [scenario]
The scenario should always:
be in a setting
2. doing a thing (use dynamic verbs, not passive things like "waiting" or "watching")
3. showing a strong emotion
Make sure to use the exact template given.
1. Core character appearance

Figure out a phrase that generally defines the character's face, hair, and build in a few words. Examples:

a distinctly feminine green-eyed, white-furred tabaxi monk (with fluffy cheeks and a tuft on her head)
a tall, slender ageless elf wizard (flowing hair and sharp features)
a girly halfling wild mage with tussled, shoulder-length bright red hair and a freckled round face
a rugged, tattooed dwarf warrior with thick, braided mahogany beard and a chiseled square face
a shifty crimson-skinned tiefling rogue with slick, coal-black hair and youthful, sharp face with curled horns
2. Simple worn and carried items

A few words defining the general style and color of garb, with an accessory, such as:

wearing a simple green monk tunic and carrying a pack
waring a white and gold robe with leaf patterns and a necklace of large mala beads
wearing a sorcerer's traveling tunic and walking staff
wearing sturdy heavy armor with a heater shield and battleaxe
wearing brown leather armor with a bandolier of vials
3. Image style

Choose a "base" style, of which I have found the most consistently good looking for characters is "digital painting". Then, choose 3 or 4 "style attributes", things like:

cell shading, soft shading, realistic shading, stippling
clean linework, bold linework, inked lines
vibrant palette, muted palette, pastel colors
smooth textures, brush stroke textures, patterned textures
stylized proportions, realistic proportions, heroic proportions, exaggerated features
dramatic lighting, high contrast, atmospheric lighting
I personally found that my favorites (that I used for these examples) are gradient shading, clean linework, vibrant palette, and stylized proportions.

4. Scenario

I usually let ChatGPT come up with a bunch of examples of this, but whether you're doing it yourself or having ChatGPT generate it, you should always do:

in a setting
doing a thing (dynamic verbs)
showing a strong emotion
Putting it all together

The core prompt you want to pass to DALL-E 3 is:

Digital painting of [character appearance] with [style attributes]. Wearing [worn and carried], [scenario]
For example:

Digital painting of a distinctly feminine green-eyed, white-furred tabaxi monk (with fluffy cheeks and a tuft on her head) with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing a simple green monk tunic and carrying a pack, [scenario]
Digital painting of a tall, slender ageless elf wizard (flowing hair and sharp features) with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing a white and gold robe with leaf patterns and a necklace of large mala beads, [scenario]
Digital painting of a girly halfling with tussled, shoulder-length bright red hair and a freckled round face with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing a blue sorcerer's traveling tunic and walking staff, [scenario]
Digital painting of a rugged, tattooed dwarf warrior with thick, braided mahogany beard and a chiseled square face with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing sturdy heavy armor with a heater shield and battleaxe, [scenario]
Digital painting of a shifty crimson-skinned tiefling rogue with slick, coal-black hair and youthful, sharp face with curled horns with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing brown leather armor with a bandolier of vials, [scenario]
Then, you need to wrap it in instructions to make sure ChatGPT passes it directly to DALL-E 3 without massaging it like it tends to do. For example:

Generate images using this exact template:
Digital painting of a distinctly feminine green-eyed, white-furred tabaxi monk (with fluffy cheeks and a tuft on her head) with gradient shading, clean linework, vibrant palette, and stylized proportions. Wearing a simple green monk tunic and carrying a pack, [scenario]
The scenario should always:
be in a setting
2. doing a thing (use dynamic verbs, not passive things like "waiting" or "watching")
3. showing a strong emotion
Make sure to use the exact template given.
Now you can run the prompt over and over and over and the output will look very close to the same character for every prompt, in a bunch of interesting and dynamic poses.

Important note

I have found that DALLE3 changes the way it renders faces in different scenarios:

my tabaxi monk got more "fluffy" with altered face details if I brought it in for a closeup
using passive verbs tended to result in a lot of head-and-shoulders shots, using active verbs resulted in a lot of full-body shots
Requesting "framed in a round token on a 1:1 canvas with a stylized [theme] background and border]" makes an excellent looking VTT token, but you'll never quite get the same character appearance as you do with your action shots.
Generally speaking, stick with action poses that show most or all of the character's body, so that you can manually specify different scenarios and have a consistent looking character for them.
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant specializing in creating character descriptions for image generation.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_object',
    },
  })

  const res = JSON.parse(chatCompletion.choices[0].message.content)
  return res.characters
}

async function generateImage(prompt, outputPath) {
  const dalleResponse = await client.images.generate({
    prompt: prompt,
    model: 'dall-e-3',
    n: 1,
    size: '1024x1024',
    style: 'natural',
  })

  const imageUrl = dalleResponse.data[0].url
  const imageData = await fetch(imageUrl).then((res) => res.arrayBuffer())
  await fs.writeFile(outputPath, Buffer.from(imageData))
  console.log(`Image saved to ${outputPath}`)
}

async function processSectionImages(section) {
  const { id, title } = section
  const jsonFilePath = `output/imagesData/${id}.json`
  const outputDir = `output/imagesGen/${id}`

  try {
    const imageArray = JSON.parse(await fs.readFile(jsonFilePath, 'utf-8'))

    // Delete the folder if there
    await fs.rm(outputDir, { recursive: true, force: true })
    // Create output directory for the section
    await fs.mkdir(outputDir, { recursive: true })

    // Load cleaned text for theme and character description generation
    const cleanedText = await fs.readFile(`output/cleaned/${id}.txt`, 'utf-8')

    // Generate general theme
    const theme = await generateTheme(cleanedText)
    const themeFilePath = path.join(outputDir, 'theme.json')
    await fs.writeFile(themeFilePath, JSON.stringify({ theme }, null, 2), 'utf-8')
    console.log(`Theme saved to ${themeFilePath}`)

    // Generate character descriptions
    const characters = await generateCharacterDescription(cleanedText, imageArray)
    const charactersFilePath = path.join(outputDir, 'characters.json')
    await fs.writeFile(charactersFilePath, JSON.stringify({ characters }, null, 2), 'utf-8')
    console.log(`Characters description saved to ${charactersFilePath}`)

    for (const character of characters) {
      const promt = `
        Create an image of the character ${character.name} in this description from the norwegian fairytail
        ${section.title}.

        Image style:
        ${theme}

        Description:
        ${character.description}

        Other:
        image only without typography, Only one character in the image
      `

      const outputFilePath = path.join(outputDir, `${character.name}.png`)
      await generateImage(promt, outputFilePath)
    }

    // console.log(`Generating images for section: ${title} (ID: ${id})`)

    // for (const image of imageArray) {
    //   const character = characters.find((c) => image.description.includes(c.name)) || {}
    //   const imagePrompt = `
    //     Create an image based on the following description. NB! No text in the image! And only one thing happening in the image.
    //     ${image.description}

    //     Character:
    //     ${JSON.stringify(character)}
    //   `

    //   const outputFilePath = path.join(outputDir, `${image.id}.png`)
    //   await generateImage(imagePrompt, outputFilePath)

    //   // Delay 30 seconds between each image generation
    //   console.log('Waiting for 30 seconds before generating the next image...')
    //   await delay(30000)
    // }

    console.log(`Images generated for section: ${title}`)
  } catch (error) {
    console.error(`Error processing section ID: ${id}`, error.message)
  }
}

async function processAllSections() {
  try {
    let sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    console.log(`Processing ${sections.length} sections for image generation...`)

    // Debug: Only process section 4 and 5
    sections = sections.slice(3, 4)
    for (const section of sections) {
      await processSectionImages(section)
    }

    console.log('Image generation completed for all sections.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllSections()
