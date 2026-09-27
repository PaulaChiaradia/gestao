// Gera favicon.ico, icon.png e apple-icon.png a partir da arte "favicon.png".
// Uso: node scripts/build-icons.mjs <caminho-da-arte.png>
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const src = process.argv[2];
const INK = { r: 0x1c, g: 0x1b, b: 0x19 };

// 1) Monograma "PC" recortado da arte, com fundo transparente (tinta escura → opaca)
const box = { left: 395, top: 262, width: 455, height: 494 };
const { data, info } = await sharp(src).extract(box).greyscale().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i++) {
  // fundo do cartão ~245; tinta ~20 → alfa proporcional, com contraste reforçado
  const a = Math.max(0, Math.min(255, Math.round(((235 - data[i]) / 200) * 255)));
  rgba.set([INK.r, INK.g, INK.b, a], i * 4);
}
const monogram = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

// 2) Ícone quadrado: cartão claro com cantos arredondados e borda dourada, monograma ao centro
async function icon(size, { border = true } = {}) {
  const r = Math.round(size * 0.22);
  const sw = Math.max(1, Math.round(size * 0.035));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="${sw / 2}" y="${sw / 2}" width="${size - sw}" height="${size - sw}" rx="${r}" ry="${r}"
      fill="#fbf6f0" ${border ? `stroke="#b99680" stroke-width="${sw}"` : ""}/></svg>`;
  const h = Math.round(size * 0.66);
  const mark = await sharp(monogram).resize({ height: h }).toBuffer();
  const meta = await sharp(mark).metadata();
  return sharp(Buffer.from(svg))
    .composite([{ input: mark, left: Math.round((size - meta.width) / 2), top: Math.round((size - h) / 2) }])
    .png()
    .toBuffer();
}

// 3) favicon.ico com 16, 32 e 48 px (PNG embutido em cada entrada)
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await sharp(await icon(512)).resize(s, s).png().toBuffer());
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...pngs]));

// 4) icon.png (navegadores modernos) e apple-icon.png (atalho no celular, arte completa)
writeFileSync("src/app/icon.png", await icon(512));
await sharp(src)
  .extract({ left: 100, top: 95, width: 1052, height: 1060 })
  .resize(180, 180, { fit: "cover" })
  .flatten({ background: "#fdf9f3" })
  .png()
  .toFile("src/app/apple-icon.png");

// prévias para conferência
for (const s of [16, 32]) await sharp(await icon(512)).resize(s, s).resize(s * 8, s * 8, { kernel: "nearest" }).toFile(`${process.env.TEMP}/prev-${s}.png`);
console.log("ícones gerados");
