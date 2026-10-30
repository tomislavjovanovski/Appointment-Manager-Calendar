import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const publicUrl = new URL('../public/', import.meta.url);
const brand = JSON.parse(await readFile(new URL('../src/config/brand.json', import.meta.url), 'utf8'));
const svg = await readFile(new URL('favicon.svg', publicUrl), 'utf8');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const render = async (size, maskable = false) => {
    const data = await page.evaluate(async ({ svg, size, maskable, background }) => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable');
      if (maskable) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size, size);
      }
      const inset = maskable ? size * 0.18 : 0;
      ctx.drawImage(image, inset, inset, size - inset * 2, size - inset * 2);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size, maskable, background: brand.themeColor });
    return Buffer.from(data, 'base64');
  };

  for (const [file, size, maskable] of [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, false],
  ]) {
    await writeFile(new URL(file, publicUrl), await render(size, maskable));
  }

  const png = await render(32);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(new URL('favicon.ico', publicUrl), Buffer.concat([header, png]));

  const social = await page.evaluate(async ({ brand, svg }) => {
    const image = new Image();
    image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    await image.decode();
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    ctx.fillStyle = brand.backgroundColor;
    ctx.fillRect(0, 0, 1200, 630);
    ctx.drawImage(image, 72, 76, 96, 96);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 64px Arial, sans-serif';
    ctx.fillText(brand.name, 196, 146);
    ctx.fillStyle = brand.themeColor;
    ctx.font = '500 29px Arial, sans-serif';
    ctx.fillText(brand.productDescription, 72, 240);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 42px Arial, sans-serif';
    ctx.fillText(brand.slogan, 72, 352);
    ctx.fillStyle = '#475569';
    ctx.font = '400 25px Arial, sans-serif';
    ctx.fillText(brand.supportingDescription, 72, 426);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { brand, svg });
  await writeFile(new URL('brand-social.png', publicUrl), Buffer.from(social, 'base64'));

  const manifest = {
    id: './',
    name: brand.name,
    short_name: brand.name,
    description: brand.metaDescription,
    lang: 'mk',
    start_url: './',
    scope: './',
    display: 'standalone',
    theme_color: brand.themeColor,
    background_color: brand.backgroundColor,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await writeFile(new URL('manifest.webmanifest', publicUrl), `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await browser.close();
}
