/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

/* ───────── базовые пути ──────────────────────────────────────────────── */
const baseDir  = __dirname;                               // …/proposals
const template = path.join(baseDir, 'template.html');
const outputFN = path.join(baseDir, 'index.html');

/* ───────── помощник: распознаём логотип ─────────────────────────────── */
const isLogo = src => /miraglogo(?:mini)?\.png$/i.test(src);

/* ───────── 1. Собираем папки-объекты ────────────────────────────────── */
const folders = fs.readdirSync(baseDir)
  .filter(f => /^\d+$/.test(f) && fs.existsSync(path.join(baseDir, f, 'index.html')))
  .sort((a, b) => Number(b) - Number(a));                 // свежие выше

/* ───────── 2. Формируем HTML карточек ───────────────────────────────── */
const cardsHTML = folders.map(folder => {
  const html = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
  const $    = cheerio.load(html);

  /* ─ Заголовок ─ */
  const title = $('h1').first().text().trim()
             || $('title').text().trim()
             || `Объект № ${folder}`;                     // fallback

  /* ─ Описание (берём первый <ul>) ─ */
  const ulRaw = $('ul').first().html();
  const ul    = ulRaw ? `<ul class="text-gray-600 mb-4">${ulRaw}</ul>` : '';

  /* ─ Главное фото ─ */
  const img = $('.gallery-slider .swiper-slide img').first().attr('src')   // точный селектор
          || $('img').first().attr('src')                                  // резерв
          || 'https://images.miraginvest.com/placeholder.jpg';

  /* ─ Выбираем класс для object-fit ─ */
  const imgClass = isLogo(img)
      ? 'object-contain bg-white'        // логотип — не обрезаем
      : 'object-cover';                  // обычное фото

  /* ─ Карточка ─ */
  return `
    <div class="article-card bg-white rounded-xl shadow-lg overflow-hidden" data-aos="fade-up">
      <div class="h-48 overflow-hidden">
        <img src="${img}" alt="${title}"
             class="w-full h-full ${imgClass} transition-transform duration-500 hover:scale-110">
      </div>
      <div class="p-6">
        <h3 class="font-mont text-xl font-bold text-blue-900 mb-2">${title}</h3>
        ${ul}
        <a href="${folder}/index.html" class="text-blue-600 font-semibold hover:underline">Подробнее →</a>
      </div>
    </div>`;
}).join('\n');

/* ───────── 3. Вставляем карточки в шаблон ───────────────────────────── */
const templateHTML = fs.readFileSync(template, 'utf8');
const finalHTML    = templateHTML.replace('<!-- AUTO_CARDS -->', cardsHTML);

/* ───────── 4. Сохраняем итоговый index.html ─────────────────────────── */
fs.writeFileSync(outputFN, finalHTML, 'utf8');
console.log('✅  proposals/index.html пересобран.');
