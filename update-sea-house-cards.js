const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

/* ───────── конфигурация путей ─────────────────────────────────────────── */
const repoRoot  = __dirname;                     // …/main
const baseDir   = path.join(repoRoot, 'land_parcel');
const indexPath = path.join(repoRoot, 'index.html');

/* ───────── вспомогательные функции ────────────────────────────────────── */
const priceRe  = /(?:€\s*[\d\s.,]+|[\d\s.,]+\s*€)/i;
const beautify = n => n
  .replace(/[^\d]/g, '')                  // оставляем цифры
  .replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // «1 234 567»

/* три градиента для кнопок «Подробнее» */
const btnGrad = [
  { from:'pink-400',   to:'blue-400',  hFrom:'blue-400',  hTo:'teal-400'  },
  { from:'purple-400', to:'teal-400',  hFrom:'teal-400',  hTo:'pink-400'  },
  { from:'green-400',  to:'blue-400',  hFrom:'blue-400',  hTo:'green-400' }
];

/* ───────── помощники ──────────────────────────────────────────────────── */
const isLogo = src => /miraglogomini\.png$/i.test(src);

/* осторожно читаем файл */
function safeRead(file, enc='utf8') {
  try { return fs.readFileSync(file, enc); } catch { return ''; }
}

/* ───────── читаем папки и вытаскиваем данные ──────────────────────────── */
const cards = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a))              // свежие сверху
  .map(folder => {
    const html = safeRead(path.join(baseDir, folder, 'index.html'));
    const $    = cheerio.load(html || '');

    /* ─ Заголовок ─ */
    let title = $('h1').first().text().trim() || $('title').text().trim();
    title = title.replace(priceRe, '').replace(/[\-|—|•]+/g, ' ')
                 .replace(/\s{2,}/g, ' ').trim();

    /* ─ Цена ─ (meta → <li> → <title>) */
    const priceRaw =
          $('meta[property="product:price:amount"]').attr('content')?.trim() ||
          $('meta[property="og:price:amount"]').attr('content')?.trim() ||
          $('li').filter((_, el) => /стоимост|цена/i.test($(el).text()))
                 .text().match(priceRe)?.[0] ||
          $('title').text().match(priceRe)?.[0] || '';
    const price = beautify(priceRaw);

    /* ─ Картинка (ищем первую внутри /sea_house/ID/) ─ */
    let image = '';
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!image && /\/sea_house\/\d+\/[^\/]+\.(?:jpe?g|png|webp)$/i.test(src)) image = src;
    });
    if (!image)
      image = $('meta[property="og:image"]').attr('content') ||
              'https://images.miraginvest.com/placeholder.jpg';

    /* ─ Характеристики ─ */
    let features = '';
    let ul = $('ul').first();

    // если в карточке нет списков, попробуем собрать из таблицы
    if (!ul.length) {
      const tbl = $('table').first();
      if (tbl.length) {
        const rows = [];
        tbl.find('tr').each((_, tr) => {
          const tds = $(tr).find('th,td');
          if (tds.length >= 2) {
            const k = $(tds[0]).text().trim();
            const v = $(tds[1]).text().trim();
            if (k && v && !/стоимост|цена/i.test(k)) rows.push(`<li><strong>${k}:</strong> ${v}</li>`);
          }
        });
        if (rows.length) {
          ul = cheerio.load(`<ul>${rows.join('')}</ul>`)('ul');
        }
      }
    }

    if (ul.length) {
      ul.find('li').filter((_, el) => /стоимост|цена/i.test($(el).text())).remove();
      features = `<ul class="text-gray-600 mt-1 list-disc pl-5">${ul.html()}</ul>`;
    } else {
      const desc = $('meta[name="description"]').attr('content') || '';
      features   = `<p class="text-gray-700 mt-1">${desc}</p>`;
    }

    const url = `https://miraginvest.com/sea_house/${folder}/`;
    return { title, price, image, features, url };
  })
  .slice(0, 3);                                       // берём три последних

/* ───────── HTML карточек ──────────────────────────────────────────────── */
const cardsHTML = cards.map((c, i) => {
  const g = btnGrad[i % btnGrad.length];
  const imgClass = isLogo(c.image)
      ? 'object-contain bg-white'      // логотип
      : 'project-img object-cover';    // обычное фото

  return `\n  <div class="blur-bg rounded-2xl shadow-xl p-0" data-aos="zoom-in" data-aos-delay="${50 + i*50}">\n    <img src="${c.image}" alt="${c.title}"\n         class="w-full h-48 rounded-t-2xl transition-transform duration-300 hover:scale-105 ${imgClass}">\n    <div class="p-5 flex flex-col h-full">\n      <div>\n        <h3 class="font-mont text-xl font-bold text-blue-800">${c.title}</h3>\n        ${c.features}\n      </div>\n      <div class="flex items-end mt-3">\n        <span class="font-mont text-lg text-blue-500 font-bold">€ ${c.price}</span>\n        <a href="${c.url}"\n           class="ml-auto bg-gradient-to-r from-${g.from} to-${g.to} text-white rounded-full\n                  px-6 py-2 font-semibold shadow-lg hover:from-${g.hFrom} hover:to-${g.hTo}\n                  transition-colors duration-250">Подробнее</a>\n      </div>\n    </div>\n  </div>`;
}).join('\n');

/* ───────── формируем/обновляем секцию ─────────────────────────────────── */
const sectionHTML = `<!-- SECTION: Дома у моря -->\n<section id="sea-house" class="max-w-7xl mx-auto px-2 pt-14 pb-0">\n  <div class="flex flex-wrap items-center justify-between mb-10">\n    <h2 class="font-mont text-3xl md:text-4xl font-bold text-blue-800" data-aos="fade-right">Дома у моря</h2>\n    <p class="text-gray-600 ml-4" data-aos="fade-left">Продажа домов у моря</p>\n  </div>\n  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">\n    ${cardsHTML}\n  </div>\n  <div class="flex justify-center mt-12 aos-init aos-animate" data-aos="fade-up" data-aos-delay="200">\n    <a href="https://miraginvest.com/sea_house" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:from-indigo-600 hover:to-blue-500 transition-colors duration-300">\n      Все предложения <i class="fas fa-arrow-right ml-2"></i>\n    </a>\n  </div>\n</section>`;

/* ───────── вставляем в index.html ─────────────────────────────────────── */
let indexHtml = safeRead(indexPath, 'utf8');

const seaRe  = /<!-- SECTION: Дома у моря -->[\s\S]*?<\/section>/i;
const landRe = /<!-- SECTION: Земельные участки -->[\s\S]*?<\/section>/i;

if (seaRe.test(indexHtml)) {
  // обновляем существующую секцию
  indexHtml = indexHtml.replace(seaRe, sectionHTML);
} else if (landRe.test(indexHtml)) {
  // вставляем сразу после блока земельных участков
  indexHtml = indexHtml.replace(landRe, match => match + '\n\n' + sectionHTML);
} else {
  // fallback: ищем «SECTION: Продажа» и вставляем после него
  indexHtml = indexHtml.replace(/<!-- SECTION: Продажа -->[\s\S]*?<\/section>/i, match => match + '\n\n' + sectionHTML);
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅  Блок «Дома у моря» создан/обновлён.');
