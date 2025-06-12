/* eslint-disable no-console */
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

const baseDir   = path.join(__dirname, 'proposals');   // где лежат 1/, 2/…
const template  = path.join(__dirname, 'template.html'); // ваш большой шаблон выше
const outputFN  = path.join(baseDir, 'index.html');    // итоговый файл

// ────────────────────────────────────────────────────────────────────────────────
// 1. Собираем все подпапки с index.html
// ────────────────────────────────────────────────────────────────────────────────
const folders = fs.readdirSync(baseDir)
  .filter(f => {
    const p = path.join(baseDir, f, 'index.html');
    return /^\d+$/.test(f) && fs.existsSync(p);
  })
  .sort((a, b) => Number(b) - Number(a)); // новые сверху

// ────────────────────────────────────────────────────────────────────────────────
// 2. Парсим данные каждой папки
// ────────────────────────────────────────────────────────────────────────────────
const cardsHTML = folders.map(folder => {
  const html     = fs.readFileSync(path.join(baseDir, folder, 'index.html'), 'utf8');
  const $        = cheerio.load(html);

  /* Заголовок */
  const title = $('h2').first().text().trim() || $('title').text().trim() || `Объект № ${folder}`;

  /* Список характеристик  (берём первый <ul>) */
  const ulRaw = $('ul').first().html();     // содержимое без самого <ul>
  const ul    = ulRaw ? `<ul class="text-gray-600 mb-4">${ulRaw}</ul>` : '';

  /* Картинка  */
//  const img = $('img').first().attr('src') || 'https://images.miraginvest.com/placeholder.jpg';

  return `
//  <div class="article-card bg-white rounded-xl shadow-lg overflow-hidden" data-aos="fade-up">
//    <div class="h-48 overflow-hidden">
//      <img src="${img}" alt="${title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110">
//    </div>
    <div class="p-6">
      <h3 class="font-mont text-xl font-bold text-blue-900 mb-2">${title}</h3>
      ${ul}
      <a href="${folder}/index.html" class="text-blue-600 font-semibold hover:underline">Подробнее →</a>
    </div>
  </div>`;
}).join('\n');

// ────────────────────────────────────────────────────────────────────────────────
// 3. Вставляем карточки в шаблон
// ────────────────────────────────────────────────────────────────────────────────
const templateHTML = fs.readFileSync(template, 'utf8');
const finalHTML    = templateHTML.replace('<!-- AUTO_CARDS -->', cardsHTML);

// ────────────────────────────────────────────────────────────────────────────────
// 4. Сохраняем
// ────────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(outputFN, finalHTML, 'utf8');
console.log('✅  proposals/index.html пересобран.');
