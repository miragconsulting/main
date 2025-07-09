/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

/* ────── пути ───────────────────────────────────────────────────────────── */
const repoRoot  = __dirname;                     // …/main
const baseDir   = path.join(repoRoot, 'land_parcel');
const indexPath = path.join(repoRoot, 'index.html');

/* ────── utils ──────────────────────────────────────────────────────────── */
const priceRe  = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;
const beautify = n => n.replace(/[^\d]/g, '')
                       .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* те же три градиента, что и в “Бледе” */
const btnGrad = [
  { from:'pink-400',   to:'blue-400',  hFrom:'blue-400',  hTo:'teal-400'  },
  { from:'purple-400', to:'teal-400',  hFrom:'teal-400',  hTo:'pink-400'  },
  { from:'green-400',  to:'blue-400',  hFrom:'blue-400',  hTo:'green-400' }
];

/* ────── читаем карточки (берём три свежих) ─────────────────────────────── */
const cards = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a))
  .map(folder => {
    const html = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
    const $    = cheerio.load(html);

    /* ─ заголовок ─ */
    let title = $('h1').first().text().trim() || $('title').text().trim();
    title = title.replace(priceRe, '').replace(/[\-|—|•]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

    /* ─ цена ─ (meta ▸ li ▸ title) */
    const priceRaw =
          $('meta[property="product:price:amount"]').attr('content')?.trim() ||
          $('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).text().match(priceRe)?.[0] ||
          $('title').text().match(priceRe)?.[0] || '';
    const price = beautify(priceRaw);

    /* ─ картинка ─ ищем <img> внутри /land_parcel/ID/… */
    let image = '';
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!image && /\/land_parcel\/\d+\/\w+\.(jpe?g|png)$/i.test(src)) image = src;
    });
    if (!image)
      image = $('meta[property="og:image"]').attr('content') ||
              'https://images.miraginvest.com/placeholder.jpg';

    /* ─ характеристики (без строки Стоимость) ─ */
    let features = '';
    const ul = $('ul').first();
    if (ul.length) {
      ul.find('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).remove();
      features = `<ul class="text-gray-600 mt-1 list-disc pl-5">${ul.html()}</ul>`;
    } else {
      const desc = $('meta[name="description"]').attr('content') || '';
      features   = `<p class="text-gray-700 mt-1">${desc}</p>`;
    }

    const url = `https://miraginvest.com/land_parcel/${folder}/`;
    return { title, price, image, features, url };
  })
  .slice(0, 3);

/* ────── HTML карточек ──────────────────────────────────────────────────── */
const cardsHTML = cards.map((c, i) => {
  const g = btnGrad[i % btnGrad.length];
  return `
  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i*50}">
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
                  transition-colors duration-250">Подробнее</a>
      </div>
    </div>
  </div>`; }).join('\n');

/* ────── вставляем / заменяем раздел Земельные участки ───────────────────── */
let indexHtml = fs.readFileSync(indexPath, 'utf8');

const sectionHTML = `<!-- SECTION: Земельные участки -->
<section id="land" class="max-w-7xl mx-auto px-2 pt-14 pb-0">
  <div class="flex flex-wrap items-center justify-between mb-10">
    <h2 class="font-mont text-3xl md:text-4xl font-bold text-blue-800" data-aos="fade-right">Земельные участки</h2>
    <p class="text-gray-600 ml-4" data-aos="fade-left">Продажа земельных участков</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    ${cardsHTML}
  </div>
</section>`;

/* если блок уже есть – заменяем, иначе вставляем сразу после “Дома в Бледе” */
if (/<!-- SECTION: Земельные участки -->[\s\S]*?<\/section>/i.test(indexHtml)) {
  indexHtml = indexHtml.replace(/<!-- SECTION: Земельные участки -->[\s\S]*?<\/section>/i, sectionHTML);
} else {
  indexHtml = indexHtml.replace(/<!-- SECTION: Продажа -->[\s\S]*?<\/section>/i,
    match => match + '\n\n' + sectionHTML);
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅  Блок «Земельные участки» создан/обновлён.');
