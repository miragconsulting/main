#!/usr/bin/env node
/*
 * update-sea-house-cards.js
 * --------------------------------------------------------------
 * Сканирует подпапки /sea_house/<ID>/index.html, собирает данные
 * о домах у моря и формирует/обновляет секцию <section id="sea-house">
 * в главном index.html (или template.html).
 */

// ───── зависимости ──────────────────────────────────────────────
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

// ───── константы путей ──────────────────────────────────────────
const ROOT_DIR = __dirname;                // …/sea_house
const OUT_HTML = path.join(ROOT_DIR, 'index.html');
const TPL_HTML = path.join(ROOT_DIR, 'template.html');

// ───── параметры запуска ───────────────────────────────────────
const argN     = Number(process.argv[2]);      // сколько карточек оставить
const MAX_CARDS = Number.isInteger(argN) && argN >= 0 ? argN : 3; // 0 ⇒ все

// ───── утилиты ─────────────────────────────────────────────────
const priceRe  = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;
const beautify = s => s.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const btnGrad = [
  { from: 'pink-400',   to: 'blue-400',  hFrom: 'blue-400',  hTo: 'teal-400'  },
  { from: 'purple-400', to: 'teal-400',  hFrom: 'teal-400',  hTo: 'pink-400'  },
  { from: 'green-400',  to: 'blue-400',  hFrom: 'blue-400',  hTo: 'green-400' }
];

const isLogo = src => /miraglogomini\.png$/i.test(src);

// ───── сбор данных ─────────────────────────────────────────────
const folderIds = fs.readdirSync(ROOT_DIR)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(ROOT_DIR, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a));           // свежие сначала

const usedIds = MAX_CARDS === 0 ? folderIds : folderIds.slice(0, MAX_CARDS);

const cards = usedIds.map(id => {
  const html = fs.readFileSync(path.join(ROOT_DIR, id, 'index.html'), 'utf8');
  const $    = cheerio.load(html);

  // ─ заголовок ─
  let title = $('h1').first().text().trim() || $('title').text().trim();
  title = title.replace(priceRe, '')
               .replace(/[\-|—|•]+/g, ' ')
               .replace(/\s{2,}/g, ' ')
               .trim();

  // ─ цена ─
  const priceRaw = $('meta[property="product:price:amount"]').attr('content')?.trim() ||
                   $('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).text().match(priceRe)?.[0] ||
                   $('title').text().match(priceRe)?.[0] || '';
  const price = beautify(priceRaw);

  // ─ изображение ─
  let img = '';
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!img && /\/sea_house\/\d+\/[^/]+\.(?:jpe?g|png|webp)$/i.test(src)) img = src;
  });
  if (!img) img = $('meta[property="og:image"]').attr('content') ||
                  'https://images.miraginvest.com/placeholder.jpg';

  // ─ характеристики ─
  let features = '';
  const ul = $('ul').first();
  if (ul.length) {
    ul.find('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).remove();
    features = `<ul class="text-gray-600 mt-1 list-disc pl-5">${ul.html()}</ul>`;
  } else {
    const desc = $('meta[name="description"]').attr('content') || '';
    features = `<p class="text-gray-700 mt-1">${desc}</p>`;
  }

  return {
    title,
    price,
    image: img,
    features,
    url: `https://miraginvest.com/sea_house/${id}/`
  };
});

// ───── шаблон карточек ─────────────────────────────────────────
const cardsHTML = cards.map((c, i) => {
  const g = btnGrad[i % btnGrad.length];
  const imgCls = isLogo(c.image) ? 'object-contain bg-white' : 'project-img object-cover';
  return `\n  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i * 50}">\n    <img src="${c.image}" alt="${c.title}"\n         class="w-full h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105 ${imgCls}">\n    <div class="p-5 flex flex-col h-full">\n      <div>\n        <h3 class="font-mont text-xl font-bold text-blue-800">${c.title}</h3>\n        ${c.features}\n      </div>\n      <div class="flex items-end mt-3">\n        <span class="font-mont text-lg text-blue-500 font-bold">€ ${c.price}</span>\n        <a href="${c.url}"\n           class="ml-auto bg-gradient-to-r from-${g.from} to-${g.to} text-white rounded-full px-6 py-2 font-semibold shadow-lg hover:from-${g.hFrom} hover:to-${g.hTo} transition-colors duration-250">Подробнее</a>\n      </div>\n    </div>\n  </div>`;
}).join('\n');

// ───── финальная секция ───────────────────────────────────────
const sectionHTML = `<!-- SECTION: Дома у моря -->\n<section id="sea-house" class="max-w-7xl mx-auto px-2 pt-14 pb-0">\n  <div class="flex flex-wrap items-center justify-between mb-10">\n    <h2 class="font-mont text-3xl md:text-4xl font-bold text-blue-800" data-aos="fade-right">Дома у моря</h2>\n    <p class="text-gray-600 ml-4" data-aos="fade-left">Апартаменты, виллы и дома у моря</p>\n  </div>\n  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">\n    ${cardsHTML}\n  </div>\n  <div class="flex justify-center mt-12 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">\n    <a href="https://miraginvest.com/sea_house" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:from-indigo-600 hover:to-blue-500 transition-colors duration-300">\n      Все предложения <i class="fas fa-arrow-right ml-2"></i>\n    </a>\n  </div>\n</section>`;

// ───── вставка/обновление HTML ────────────────────────────────
const baseHtml = fs.existsSync(TPL_HTML)
  ? fs.readFileSync(TPL_HTML, 'utf8')
  : `<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <title>Дома у моря</title>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n  <!-- CARDS: SEA_HOUSE -->\n</body>\n</html>`;

const outputHtml = injectSection(baseHtml, sectionHTML);
fs.writeFileSync(OUT_HTML, outputHtml, 'utf8');
console.log(`✅  Блок «Дома у моря» обновлён. (${cards.length} карточк${cards.length === 1 ? 'а' : 'и'})`);

// ───── функция‑вставка ────────────────────────────────────────
function injectSection(html, section) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // 1) существующий <section id="sea-house">
  if ($('#sea-house').length) {
    $('#sea-house').replaceWith(section);
    return $.html();
  }

  // 2) плейсхолдер <!-- CARDS: SEA_HOUSE -->
  const placeholder = $('body')
    .contents()
    .filter((_, el) => el.type === 'comment' && /CARDS:\s*SEA_HOUSE/i.test(el.data));
  if (placeholder.length) {
    placeholder.replaceWith(`<!-- CARDS: SEA_HOUSE -->\n${section}\n`);
    return $.html();
  }

  // 3) комментарий <!-- SECTION: Продажа: Дома у моря -->
  let inserted = false;
  $('body').contents().each(function (_, el) {
    if (el.type === 'comment' && /SECTION:\s*Продажа:\s*Дома у моря/i.test(el.data)) {
      // найти первый <section> после комментария
      const saleSection = $(el).nextAll('section').first();
      if (saleSection.length) {
        saleSection.after(`\n${section}\n`);
        inserted = true;
      }
    }
  });
  if (inserted) return $.html();

  // 4) если ничего не найдено — добавить перед </body>
  $('body').append(`\n${section}\n`);
  return $.html();
}
