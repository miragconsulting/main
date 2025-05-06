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
  
  // let imageUrl = null; // 🔽 Отключаем обработку изображений

  try {
    const content = fs.readFileSync(indexPath, "utf8");

    // Получаем <title>
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // 🔽 Удалено: попытка найти <img src="..."> в HTML
    // const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    // if (imgMatch && imgMatch[1]) {
    //   imageUrl = imgMatch[1];
    // }
  } catch (e) {
    console.warn(`Не удалось прочитать ${folder}/index.html`);
  }

  // 🔽 Удалено: логика выбора между image.png и <img src>
  // const localImagePath = path.join(articlesDir, folder, "image.png");
  // const finalImage = fs.existsSync(localImagePath)
  //   ? `${folder}/image.png`
  //   : imageUrl;

  return {
    folder,
    title,
    // image: finalImage || null // 🔽 Отключаем поле image
  };
});

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


