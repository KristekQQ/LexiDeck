// Generate simple solid PNG icons for PWA
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

function makePng(size, color) {
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      png.data[idx] = color[0]
      png.data[idx + 1] = color[1]
      png.data[idx + 2] = color[2]
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

const outDir = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })
const teal = [15, 118, 110]

fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePng(192, teal))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePng(512, teal))
console.log('Generated icons in', outDir)

