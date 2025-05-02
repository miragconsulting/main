const fs = require("fs");
const path = require("path");

const articlesDir = __dirname;

const folders = fs.readdirSync(articlesDir).filter((f) => {
  const folderPath = path.join(articlesDir, f);
  return fs.statSync(folderPath).isDirectory() &&
         fs.existsSync(path.join(folderPath, "index.html")) &&
         fs.existsSync(path.join(folderPath, "image.png"));
});

const articles = folders.map((folder) => {
  const indexPath = path.join(articlesDir, folder, "index.html");
  let title = folder.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());  // fallback

  try {
    const content = fs.readFileSync(indexPath, "utf8");
    const match = content.match(/<title>(.*?)<\/title>/i);
    if (match && match[1]) {
      title = match[1].trim();
    }
  } catch (e) {
    console.warn(`Не удалось прочитать заголовок из ${folder}/index.html`);
  }

  return {
    folder,
    title
  };
});

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Список статей</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
    .article { display: flex; margin-bottom: 20px; background: #fff; border: 1px solid #ccc; border-radius: 8px; text-decoration: none; color: #000; }
    .article img { width: 200px; object-fit: cover; }
    .article div { padding: 15px; }
    .article h2 { margin: 0 0 10px; }
  </style>
</head>
<body>
<h1>Список статей</h1>
${articles.map((article) => {
  return `<a href="${article.folder}/index.html" class="article">
    <img src="${article.folder}/image.png" alt="Превью">
    <div><h2>${article.title}</h2><p>Подробнее...</p></div>
  </a>`;
}).join("\n")}
</body>
</html>`;

fs.writeFileSync(path.join(articlesDir, "index.html"), html, "utf8");
console.log("index.html создан успешно.");
