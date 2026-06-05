# Languages
Eng <-> Chinese
Eng <-> Korean
Eng <-> Japanese

# Core Features needed to implement (maybe one feature per person?):
1. Scan page for manga images, extract and feed them into the pipeline
Find a way to extract text bubbles from the manga page, using flood fill right now! (William) 
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
