let catImages = [
  "https://i.imgur.com/FCwrLol.gif",
  "https://i.imgur.com/SWPGEMo.gif",
  "https://i.imgur.com/ziwGDNH.gif",
  "https://i.imgur.com/facfWox.gif",
  "https://i.imgur.com/aWBZcab.gif",
];

const imgs = document.getElementsByTagName("img");

for (image of imgs) {
  const index = Math.floor(Math.random() * catImages.length);
  image.src = catImages[index];
}