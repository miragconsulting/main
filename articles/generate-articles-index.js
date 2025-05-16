const fs = require("fs");
const path = require("path");

const articlesDir = __dirname;

// 1. Собираем статьи
const folders = fs.readdirSync(articlesDir).filter((f) => {
  const folderPath = path.join(articlesDir, f);
  return fs.statSync(folderPath).isDirectory() &&
         fs.existsSync(path.join(folderPath, "index.html"));
});

const articles = folders.map((folder) => {
  const indexPath = path.join(articlesDir, folder, "index.html");
  let title = folder.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    const content = fs.readFileSync(indexPath, "utf8");
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  } catch (e) {
    console.warn(`Не удалось прочитать ${folder}/index.html`);
  }

  return { folder, title };
});

// 2. HTML карточки статей
const articlesHtml = articles.map((article) => {
  return `<a href="${article.folder}/index.html" class="block bg-white border border-gray-300 rounded-lg p-4 hover:shadow transition mb-4">
    <h2 class="text-lg font-semibold mb-1">${article.title}</h2>
    <p class="text-gray-600">Подробнее...</p>
  </a>`;
}).join("\n");

// 3. Полный HTML
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Список статей</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Шрифты -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">

  <!-- Tailwind CSS -->
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">

  <!-- Иконка -->
  <link rel="icon" href="https://images.miraginvest.com/favicon.ico">

  <style>
    body {
      font-family: "Open Sans", Arial, sans-serif;
      background: linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%);
      color: #243146;
    }
    .font-mont { font-family: 'Montserrat', Arial, sans-serif; }
  </style>
</head>
<body class="antialiased min-h-screen">

  <!-- Шапка -->
  <header class="w-full z-40 relative pt-6 pb-2 px-4 sm:px-8 flex flex-col items-center justify-center">
    <div class="w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between">
      <a href="https://miraginvest.com/">
        <div class="flex items-center space-x-3" data-aos="fade-right">
          <img src="https://images.miraginvest.com/miraglogo.png" alt="Mirag Logo" class="h-14 sm:h-16 w-auto">
          <span class="text-2xl sm:text-3xl font-mont font-bold tracking-tight" style="color: #4b00dd;">
          MIRAG CONSULTING D.O.O.
          </span>
        </div>
      </a>
      <div class="hidden sm:flex font-mont text-base tracking-wide space-x-7">
        <span class="text-blue-400">20+ лет на рынке</span>
        <span class="text-gray-500">Эксперты: финансы, инжиниринг, недвижимость</span>
      </div>
    </div>
  </header>

  <!-- Кнопка Назад -->
  <div class="px-4 sm:px-8 mt-6">
    <a href="https://miraginvest.com/" class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium bg-gradient-to-r from-purple-700 to-blue-500 shadow hover:scale-105 transform transition">
      ← На главную
    </a>
  </div>

  <!-- Заголовок -->
  <div class="px-4 sm:px-8 mt-6">
    <h1 class="text-2xl font-bold mb-4">Список статей</h1>

    <!-- Карточки -->
    ${articlesHtml}
  </div>

</body>
</html>`;

// 4. Сохраняем
fs.writeFileSync(path.join(articlesDir, "index.html"), html, "utf8");
console.log("✅ Главная index.html успешно создана в стиле сайта MIRAG.");
