const { createWorker } = require('tesseract.js');

async function main() {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize('image.png');
  console.log(text);
  await worker.terminate();
}

main();