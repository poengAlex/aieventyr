# Getting the data

I tried to find the old fairytales in plain text, but I could not find it using google. I found a copy of the original book on https://ia802201.us.archive.org/33/items/norskefolkeeven01moegoog/norskefolkeeven01moegoog.pdf . Unfortunally, the book is a scan (images), so step 1 will be to extract the text from the pdf using a OCR tool.

# Extracting the text

ChatGPT recommended using tesseract.js + pdf-poppler. I will try this first.
This caused some dependencies error. Im not here to debug, I just want to code something as quick as possible so I moved over to another solution. The next recommendation was to use pdf2img, but also there I got some dependency issues and some 404 (maybe because I am in Mexico at the momeent with slow internet). Next suggestion was pdf2pic. This seems to work, and now I got the text exracted per page. I made a short script to add the text to one file with the page nr as [PAGE nr] header. Next I will use openAI to index the whole book (indexText.js). Then I will write another script to extract each section and rewrites it using AI to fix any OCR errors (extractSection.js).

Next will be to take all the sections and rewrite them using AI to fix any OCR errors. I will use the openAI API for this. (refineText.js). The outputs are stored in output/cleaned/ folder.

Notes:

- I had to redo the OCR with danish language, as the first OCR was in Norwegian, and the text was not optimal.
- There is apparently a bind 2 of the book. I will skip this for now.
- The page nrs were not perfect, so I manually fixed them in the json file.

# Finding images

## What images should be added

Fist I want to do is to let the AI generate an array of images that should be added to the book. I will use the openAI API for this. (generateImagesData.js). The images are stored in output/imagesData/ folder. The format will be sectionId.json

## Creating the images

Now that we know what images we want I want to make a new script that makes the promt for actually generating the images. Using Dall-E we need to be pretty strickt on the desctiption of the charecthers to create consistent images. I will use the openAI API for this. (generateImages.js). The images are stored in output/imagesGen/id folder, where id is the sectionId.

After some intitial image generation I find the generated images pretty lame. Im also capped at 7 images per min as a limit, so testing is a little slow. I will try another strategy to generate images of each of the charachters instead (generateImages2.js).

I had to make a 3 script to fill in the blanks of images that were not generated (generateImages2.js).

### Main images

I want to make a main image to each of the sections. I will use the openAI API for this. (generateMainImages.js). The images are stored in output/mainImages/ folder.

# Creating text variants

Now we have the text in "clean" format from the OCR, but the language is still old and hard to read. I will use the openAI API to generate a more modern version of the text were we try to change as little as possible, but makes it more understandable. In addition, I would like some alternative variants: child friendly, a english version, a variant that takes place in todays society. I will use the openAI API for this. (generateTextVariants.js). The outputs are stored in output/variants/ folder.

## Variant images

I want to have more images, so I will generate images for the variants as well. I will use the openAI API for this. (generateVariantImages.js). The images are stored in output/variantImages/ folder.

# UX

Im thinking something really simple. The main page will list all the sections with the main image variant. At the top you can switch between the different variants. When you click on a section you go to a route that shows the fairytale with the chapter image and the text.
