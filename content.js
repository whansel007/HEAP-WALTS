let catImages = [
  "https://imgur.com/FCwrLol",
  "https://imgur.com/SWPGEMo",
  "https://imgur.com/ziwGDNH",
  "https://imgur.com/facfWox",
  "https://imgur.com/aWBZcab",
];

const imgs = document.getElementsByTagName("img");

for (image of imgs) {
  const index = Math.floor(Math.random() * catImages.length);
  image.src = catImages[index];
}