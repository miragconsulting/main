const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

/* ───────── конфигурация путей ─────────────────────────────────────────── */
const dirSeaHouse = __dirname; // …/sea_house
const indexPath = path.join(dirSeaHouse, 'index.html');
const tplPath = path.join(dirSeaHouse, 'template.html');

/* ───────── параметры запуска ──────────────────────────────────────────── */
const argN = Number(process.argv[2]);
const takeN = Number.isInteger(argN) && argN >= 0 ? argN : 3; // 0 => все

/* ───────── вспомогательные функции ────────────────────────────────────── */
const priceRe = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;
const beautify = n => n
  .replace(/[^\d]/g, '')
  .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* три градиента для кнопок «Подробнее» */
const btnGrad = [
  { from: 'pink-400', to: 'blue-400', hFrom: 'blue-400', hTo: 'teal-400' },
  { from: 'purple-400', to: 'teal-400', hFrom: 'teal-400', hTo: 'pink-400' },
  { from: 'green-400', to: 'blue-400', hFrom: 'blue-400', hTo: 'green-400' }
];

/* ───────── новый помощник: определяем логотип ─────────────────────────── */
const isLogo = src => /miraglogomini\.png$/i.test(src);

/* ───────── читаем подпапки и вытаскиваем данные ───────────────────────── */
const ids = fs.readdirSync(dirSeaHouse)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(dirSeaHouse, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a));

const sliceIds = takeN === 0 ? ids : ids.slice(0, takeN);

const cards = sliceIds.map(folder => {
  const html = fs.readFileSync(path.join(dirSeaHouse, folder, 'index.html'), 'utf8');
  const $ = cheerio.load(html);

  let title = $('h1').first().text().trim() || $('title').text().trim();
  title = title.replace(priceRe, '').replace(/[\-|—|•]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  const priceRaw =
    $('meta[property="product:price:amount"]').attr('content')?.trim() ||
    $('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).text().match(priceRe)?.[0] ||
    $('title').text().match(priceRe)?.[0] || '';
  const price = beautify(priceRaw);

  let image = '';
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!image && /\/sea_house\/\d+\/[^/]+\.(jpe?g|png|webp)$/i.test(src)) image = src;
  });
  if (!image) {
    image = $('meta[property="og:image"]').attr('content') || 'https://images.miraginvest.com/placeholder.jpg';
  }

  let features = '';
  const ul = $('ul').first();
  if (ul.length) {
    ul.find('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).remove();
    features = `<ul class="text-gray-600 mt-1 list-disc pl-5">${ul.html()}</ul>`;
  } else {
    const desc = $('meta[name="description"]').attr('content') || '';
    features = `<p class="text-gray-700 mt-1">${desc}</p>`;
  }

  const url = `https://miraginvest.com/sea_house/${folder}/`;
  return { title, price, image, features, url };
});

/* ───────── HTML карточек ──────────────────────────────────────────────── */
const cardsHTML = cards.map((c, i) => {
  const g = btnGrad[i % btnGrad.length];
  const imgClass = isLogo(c.image) ? 'object-contain bg-white' : 'project-img object-cover';

  return `
  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i * 50}">
    <img src="${c.image}" alt="${c.title}"
         class="w-full h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105 ${imgClass}">
    <div class="p-5 flex flex-col h-full">
      <div>
        <h3 class="font-mont text-xl font-bold text-blue-800">${c.title}</h3>
        ${c.features}
      </div>
      <div class="flex items-end mt-3">
        <span class="font-mont text-lg text-blue-500 font-bold">€ ${c.price}</span>
        <a href="${c.url}"
           class="ml-auto bg-gradient-to-r from-${g.from} to-${g.to} text-white rounded-full
                  px-6 py-2 font-semibold shadow-lg hover:from-${g.hFrom} hover:to-${g.hTo}
                  transition-colors duration-250">Подробнее</a>
      </div>
    </div>
  </div>`;
}).join('\n');

/* ───────── секция для шаблона ─────────────────────────────────────────── */
const sectionHTML = `<!-- SECTION: Дома у моря -->
<section id="sea-house" class="max-w-7xl mx-auto px-2 pt-14 pb-0">
  <div class="flex flex-wrap items-center justify-between mb-10">
    <h2 class="font-mont text-3xl md:text-4xl font-bold text-blue-800" data-aos="fade-right">Дома у моря</h2>
    <p class="text-gray-600 ml-4" data-aos="fade-left">Апартаменты, виллы и дома у моря</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    ${cardsHTML}
  </div>
  <div class="flex justify-center mt-12 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
    <a href="https://miraginvest.com/sea_house" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:from-indigo-600 hover:to-blue-500 transition-colors duration-300">
      Все предложения <i class="fas fa-arrow-right ml-2"></i>
    </a>
  </div>
</section>`;

/* ───────── загрузка шаблона ───────────────────────────────────────────── */
let outHtml;
if (fs.existsSync(tplPath)) {
  outHtml = fs.readFileSync(tplPath, 'utf8');

  if (/<!-- CARDS: SEA_HOUSE -->/i.test(outHtml)) {
    outHtml = outHtml.replace(/<!-- CARDS: SEA_HOUSE -->[\s\S]*?(?=<!--|<\/body>)/i, `<!-- CARDS: SEA_HOUSE -->\n${sectionHTML}\n`);
  } else if (/<!-- SECTION: Дома у моря -->[\s\S]*?<\/section>/i.test(outHtml)) {
    outHtml = outHtml.replace(/<!-- SECTION: Дома у моря -->[\s\S]*?<\/section>/i, sectionHTML);
  } else {
    outHtml = outHtml.replace(/<\/body>/i, `${sectionHTML}\n</body>`);
  }
} else {
  outHtml = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <title>Дома у моря</title>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n</head>\n<body>\n${sectionHTML}\n</body>\n</html>`;
}

/* ───────── запись результата ──────────────────────────────────────────── */
fs.writeFileSync(indexPath, outHtml, 'utf8');
console.log(`✅  Блок «Дома у моря» создан/обновлён. (${cards.length} карточк${cards.length === 1 ? 'а' : 'и'})`);

