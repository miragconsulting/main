/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

/* ────── пути ─────────────────────────────────────────────────────────────── */
const repoRoot  = __dirname;                     // …/main
const baseDir   = path.join(repoRoot, 'proposals');
const indexPath = path.join(repoRoot, 'index.html');

/* ────── вспомогательные ──────────────────────────────────────────────────── */
const priceAnyRe = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;

/** превращаем «1350000» → «1 350 000» */
const pretty = n =>
  n.replace(/[^\d]/g, '')
   .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** извлечь цену из DOM */
function getPrice($) {
  // 1) <meta property="product:price:amount">
  const meta = $('meta[property="product:price:amount"]').attr('content');
  if (meta) return pretty(meta);

  // 2) <li>Стоимость …</li>
  const li = $('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).first();
  const liMatch = li.text().match(priceAnyRe);
  if (liMatch) return pretty(liMatch[0]);

  // 3) отдельный <strong>Цена: …</strong>
  const strong = $('strong').filter((_, el) => /цена/i.test($(el).text())).first();
  const strongMatch = strong.text().match(priceAnyRe);
  if (strongMatch) return pretty(strongMatch[0]);

  // 4) title | … € …
  const titleMatch = $('title').text().match(priceAnyRe);
  if (titleMatch) return pretty(titleMatch[0]);

  return '';                         // ничего не нашли
}

/* ────── собираем карточки ───────────────────────────────────────────────── */
const cards = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a))          // свежие ID выше
  .map(folder => {
    const html = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
    const $    = cheerio.load(html);

    /* заголовок без цены */
    let title = $('h1').first().text().trim() || $('title').text().trim();
    title = title.replace(priceAnyRe, '').replace(/[\-|—|•]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    /* цена */
    const price = getPrice($);

    /* картинка */
    const image = $('meta[property="og:image"]').attr('content')
               || $('img').first().attr('src')
               || 'https://images.miraginvest.com/placeholder.jpg';

    /* характеристики: UL без строки «Стоимость/Цена» */
    let features = '';
    const ul = $('ul').first();
    if (ul.length) {
      ul.find('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).remove();
      features = `<ul class="text-gray-600 mt-1 list-disc pl-5">${ul.html()}</ul>`;
    } else {
      const desc = $('meta[name="description"]').attr('content') || '';
      features   = `<p class="text-gray-700 mt-1">${desc}</p>`;
    }

    const url = `https://miraginvest.com/proposals/${folder}/`;
    return { title, price, image, features, url };
  })
  .filter(c => /блед/i.test(c.title))             // только объекты в Бледе
  .slice(0, 3);                                   // максимум 3 карточки

/* ────── верстаем HTML карточек ───────────────────────────────────────────── */
const htmlCards = cards.map((c, i) => `
  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i * 50}">
    <img src="${c.image}" alt="${c.title}" class="w-full project-img h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105">
    <div class="p-5">
      <h3 class="font-mont text-xl font-bold text-blue-800">${c.title}</h3>
      ${c.features}
      <p class="font-mont text-lg text-blue-500 font-bold mt-3 text-right">€ ${c.price}</p>
      <div class="flex justify-end mt-2">
        <a href="${c.url}"
           class="bg-gradient-to-r from-blue-400 to-teal-400 text-white rounded-full px-6 py-2 font-semibold shadow-lg
                  hover:from-teal-400 hover:to-blue-400 transition-colors duration-250">Подробнее</a>
      </div>
    </div>
  </div>`).join('\n');

/* ────── вставляем секцию в корневой index.html ──────────────────────────── */
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
console.log('✅ Блок «Дома в Бледе» обновлён: цена ищется в любом формате и выводится один раз внизу карточки.');

