# Languages
Eng <-> Chinese
Eng <-> Korean
Eng <-> Japanese

# Core Features needed to implement (maybe one feature per person?):
1. Scan page for manga images, extract and feed them into the pipeline
Find a way to extract text bubbles from the manga page and then crop, using flood fill right now! (William) 
2. OCR via Tesseract.js, extract text and clean up messy output 
3. Translation via LibreTranslate (Chinese, Korean, Japanese, English) (Lucas)
4. Canvas overlay, render translated text on original image
Track the coordinates of the text. Overlay a white box with the translated text.
When scrolling, the overlay should move along.
5. UI/UX, language selector popup, original/translated toggle widget, loading states, polish

# “Good to have”/Additional Features:
1. Change OCR Models
2. 

# Websites to Test on (Manga):
MANGA Plus for your baseline.
VIZ/Shonen Jump for another official source.
MangaDex for edge cases and scanlation behavior.

# Testing Guide
1. In terminal, run npx serve dev (this will create a mock simple site that only hosts an image)
2. Open http://localhost:3000 in Chrome 
3. Go to  extension settings → enable Developer mode → Load unpacked → select the project root
4. Click the extension icon → Manga Detector → Detect Bubbles
5. F12 to check Console for logs and Downloads folder for the output image

Refresh extension in the extension page after every code change! 