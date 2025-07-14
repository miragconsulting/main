/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

/* ─────────── пути ──────────────────────────────────────────────────────── */
const repoRoot  = __dirname;                 // …/main
const baseDir   = path.join(repoRoot, 'proposals');
const indexPath = path.join(repoRoot, 'index.html');

/* ─────────── настройки ──────────────────────────────────────────────────── */
const priceRe   = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;
const pretty    = n => n.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* градиенты для кнопок – по порядку карточек */
const btnGrad = [
  { from: 'pink-400',   to: 'blue-400',  hFrom: 'blue-400',   hTo: 'teal-400'  },
  { from: 'purple-400', to: 'teal-400',  hFrom: 'teal-400',   hTo: 'pink-400'  },
  { from: 'green-400',  to: 'blue-400',  hFrom: 'blue-400',   hTo: 'green-400' }
];

/* ─────────── сбор карточек ──────────────────────────────────────────────── */
const cards = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a))              // «свежее» = больший ID
  .map(folder => {
    const html = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
    const $    = cheerio.load(html);

    /* заголовок без цены */
    let title = $('h1').first().text().trim() || $('title').text().trim();
    title = title.replace(priceRe, '').replace(/[\-|—|•]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    /* цена: meta ▸ li ▸ strong ▸ title */
    const priceRaw =
          $('meta[property="product:price:amount"]').attr('content')?.trim() ||
          $('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).text().match(priceRe)?.[0] ||
          $('strong').filter((_, el) => /цена/i.test($(el).text())).text().match(priceRe)?.[0] ||
          $('title').text().match(priceRe)?.[0] || '';
    const price = pretty(priceRaw);

    /* картинка: первая из галереи, иначе og:image */
    let image = '';
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!image && /\/proposals\/\d+\/\d+\.(jpe?g|png)$/i.test(src)) image = src;
    });
    if (!image)
      image = $('meta[property="og:image"]').attr('content') ||
              'https://images.miraginvest.com/placeholder.jpg';

    /* характеристики – удаляем «Стоимость / Цена» */
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
  .filter(c => /блед/i.test(c.title))
  .slice(0, 3);

/* ─────────── HTML карточек ─────────────────────────────────────────────── */
const htmlCards = cards.map((c, i) => {
  const g = btnGrad[i % btnGrad.length];   // градиент для этой карточки
  return `
  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i * 50}">
    <img src="${c.image}" alt="${c.title}"
         class="w-full project-img h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105">
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
                  transition-colors duration-250">
          Подробнее
        </a>
      </div>
    </div>
  </div>`;
}).join('\n');

/* ─────────── вставляем в index.html ────────────────────────────────────── */
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
  <div class="flex justify-center mt-12 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">
    <a href="https://miraginvest.com/proposals" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:from-indigo-600 hover:to-blue-500 transition-colors duration-300">
      Все пердложения <i class="fas fa-arrow-right ml-2"></i>
    </a>
  </div>
</section>`
);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅ Блок «Дома в Бледе» обновлён: кнопки получили такие же градиенты, как в галерее проектов.');
