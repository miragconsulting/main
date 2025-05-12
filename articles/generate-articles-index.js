const fs = require("fs");
const path = require("path");

const articlesDir = __dirname;

// Список всех папок в /articles
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

    // Получаем <title>
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  } catch (e) {
    console.warn(`Не удалось прочитать ${folder}/index.html`);
  }

  return { folder, title };
});

// Строим главную страницу
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Список статей</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
    .article {
      display: block;
      margin-bottom: 20px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      text-decoration: none;
      color: #000;
      padding: 15px;
      transition: box-shadow 0.2s ease;
    }
    .article:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .article h2 {
      margin: 0 0 10px;
      font-size: 18px;
    }
    .article p {
      margin: 0;
      color: #555;
    }
  </style>
</head>
<body>
<h1>Список статей</h1>
${articles.map((article) => {
  return `<a href="${article.folder}/index.html" class="article">
    <h2>${article.title}</h2>
    <p>Подробнее...</p>
  </a>`;
}).join("\n")}
</body>
</html>`;

fs.writeFileSync(path.join(articlesDir, "index.html"), html, "utf8");
console.log("✅ index.html успешно создан.");

// 🔽 Кнопка "Назад" в каждую статью
const backButton = `<a href="https://miraginvest.com/" style="
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(90deg, #7F00FF, #3E8EFF);
  color: #fff;
  border: none;
  border-radius: 999px;
  text-decoration: none;
  font-family: sans-serif;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
">← Назад</a>`;

folders.forEach((folder) => {
  const indexPath = path.join(articlesDir, folder, "index.html");
  try {
    let content = fs.readFileSync(indexPath, "utf8");

    // Удалим старую кнопку, если есть
    content = content.replace(/<a[^>]+href="https:\/\/miraginvest\.com\/articles\/"[^>]*>.*?←.*?<\/a>/gis, '');

    // Вставим кнопку после <h1>
    content = content.replace(/<h1[^>]*>.*?<\/h1>/i, (match) => {
      return `${match}\n${backButton}`;
    });

    fs.writeFileSync(indexPath, content, "utf8");
    console.log(`🔁 Кнопка добавлена в ${folder}/index.html`);
  } catch (e) {
    console.warn(`⚠️ Не удалось обновить ${folder}/index.html`);
  }
});






