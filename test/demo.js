// Minimal Node smoke test for the portable src pipeline.
// Run with: npm test

import {
  processLesionDataset,
  processLesionImage,
  serializeLesionResult,
} from '../src/lesionPipeline.js';

const samples = [
  {
    id: 'usable_center_lesion',
    imageData: addLesionCircle(createImageData(900, 900, [178, 145, 124]), {
      radius: 150,
      color: [72, 45, 38],
    }),
  },
  {
    id: 'dark_no_roi',
    imageData: createImageData(900, 900, [12, 12, 12]),
  },
  {
    id: 'low_resolution_lesion',
    imageData: addLesionCircle(createImageData(360, 360, [178, 145, 124]), {
      radius: 55,
      color: [72, 45, 38],
    }),
  },
];

for (const sample of samples) {
  const result = processLesionImage(sample.imageData, { id: sample.id });
  console.log(`\n--- ${sample.id} ---`);
  console.log(JSON.stringify(serializeLesionResult(result), null, 2));
}

const dataset = processLesionDataset(samples, { idPrefix: 'sample' });
console.log('\n--- dataset summary ---');
console.log(JSON.stringify(dataset.summary, null, 2));

function createImageData(width, height, fill) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = 255;
  }
  return { width, height, data };
}

function addLesionCircle(image, options = {}) {
  const { width, height } = image;
  const out = new Uint8ClampedArray(image.data);
  const cx = width / 2;
  const cy = height / 2;
  const radius = options.radius ?? Math.min(width, height) * 0.18;
  const color = options.color ?? [80, 60, 50];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * width + x) * 4;
        out[idx] = color[0];
        out[idx + 1] = color[1];
        out[idx + 2] = color[2];
      }
    }
  }

  return { width, height, data: out };
}
