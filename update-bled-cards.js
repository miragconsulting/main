/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

const repoRoot   = __dirname;                      // …/main
const baseDir    = path.join(repoRoot, 'proposals');
const indexPath  = path.join(repoRoot, 'index.html');

// ── 1. собираем данные из трёх последних объектов в proposals ────────────────
const folders = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a));          // по ID как по времени

const cardsData = folders.map(folder => {
  const html = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
  const $    = cheerio.load(html);

  /* заголовок без цены */
  let title  = $('title').text().trim();
  const priceRe = /€\s*[\d\s.,]+/;                 // €1 290 000 / €2.2 M
  title = title.replace(priceRe, '').replace(/\s{2,}/g, ' ').trim();

  /* цена: из <meta> или из заголовка (если было) */
  let price  = $('meta[property="product:price:amount"]').attr('content') || '';
  if (!price) {
    const m = $('title').text().match(priceRe);
    if (m) price = m[0].replace(/[^\d.,]/g, '').trim();
  }

  /* основная картинка (og:image > первая img) */
  const image = $('meta[property="og:image"]').attr('content') ||
                $('img').first().attr('src') ||
                'https://images.miraginvest.com/placeholder.jpg';

  /* характеристики: первый <ul> (если есть) */
  const ulRaw = $('ul').first().html();
  const features = ulRaw
    ? `<ul class="text-gray-600 mt-1 list-disc pl-5">${ulRaw}</ul>`
    : `<p class="text-gray-700 mt-1">${$('meta[name="description"]').attr('content') || ''}</p>`;

  const url = `https://miraginvest.com/proposals/${folder}/`;

  return { title, features, image, price, url };
})
.filter(c => /блед/i.test(c.title))               // только «Блед»
.slice(0, 3);                                     // первые три

// ── 2. собираем HTML карточек ────────────────────────────────────────────────
const htmlCards = cardsData.map((c, i) => `
  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i * 50}">
    <img src="${c.image}" alt="${c.title}" class="w-full project-img h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105">
    <div class="p-5">
      <h3 class="font-mont text-xl font-bold text-blue-800">${c.title}</h3>
      ${c.features}
      <div class="flex items-center mt-3">
        <span class="font-mont text-lg text-blue-500 font-bold mr-1">€${c.price}</span>
        <a href="${c.url}"
           class="ml-auto bg-gradient-to-r from-blue-400 to-teal-400 text-white rounded-full px-6 py-2 font-semibold shadow-lg
                  hover:from-teal-400 hover:to-blue-400 transition-colors duration-250">
          Подробнее
        </a>
      </div>
    </div>
  </div>`).join('\n');

// ── 3. подменяем блок «Дома в Бледе» в корневом index.html ──────────────────
let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace(
  /<!-- SECTION: Продажа -->[\s\S]*?<\/section>/i,
`<!-- SECTION: Продажа -->
<section id="projects" class="max-w-7xl mx-auto px-2 pt-14 pb-0">
  <div class="flex flex-wrap items-center justify-between mb-10">
    <h2 class="font-mont text-3xl md:text-4xl font-bold text-blue-800" data-aos="fade-right">Дома в Бледе</h2>
    <p class="text-gray-600 ml-4" data-aos="fade-left">Дома которые доступны для покупки</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    ${htmlCards}
  </div>
</section>`
);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅ Секция «Дома в Бледе» обновлена (цена внизу, характеристики списком).');

