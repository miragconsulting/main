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
  let imageUrl = null;

  try {
    const content = fs.readFileSync(indexPath, "utf8");

    // Получаем <title>
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Пытаемся найти <img src="...">, если image.png отсутствует
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1];
    }
  } catch (e) {
    console.warn(`Не удалось прочитать ${folder}/index.html`);
  }

  // Если есть локальный файл image.png — используем его
  const localImagePath = path.join(articlesDir, folder, "image.png");
  const finalImage = fs.existsSync(localImagePath)
    ? `${folder}/image.png`
    : imageUrl;

  return {
    folder,
    title,
    image: finalImage || null
  };
});

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Список статей</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
    .article { display: flex; margin-bottom: 20px; background: #fff; border: 1px solid #ccc; border-radius: 8px; text-decoration: none; color: #000; overflow: hidden; }
    .article img { width: 200px; object-fit: cover; }
    .article div { padding: 15px; }
    .article h2 { margin: 0 0 10px; font-size: 18px; }
  </style>
</head>
<body>
<h1>Список статей</h1>
${articles.map((article) => {
  const imgTag = article.image
    ? `<img src="${article.image}" alt="Превью">`
    : `<div style="width:200px; height:120px; background:#ccc; display:flex; align-items:center; justify-content:center;">Нет изображения</div>`;
  return `<a href="${article.folder}/index.html" class="article">
    ${imgTag}
    <div><h2>${article.title}</h2><p>Подробнее...</p></div>
  </a>`;
}).join("\n")}
</body>
</html>`;

fs.writeFileSync(path.join(articlesDir, "index.html"), html, "utf8");
console.log("✅ index.html успешно создан.");

