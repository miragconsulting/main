import os
import re
from pathlib import Path

# ---------- Настройки --------------------------------------------------------

ARTICLES_ROOT = Path(__file__).parent           # ./articles   (можно заменить)
BACK_HREF      = "https://miraginvest.com/articles/"

TAILWIND_LINK  = (
    '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/'
    'tailwind.min.css" rel="stylesheet">'
)

FONTS_LINKS = '''
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
'''

STYLE_BLOCK = '''
<style>
  body {
    font-family: "Open Sans", Arial, sans-serif;
    background: linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%);
    color: #243146;
  }
  .font-mont { font-family: 'Montserrat', Arial, sans-serif; }
</style>
'''

HEADER_HTML = f'''
  <!-- Шапка MIRAG -->
  <header class="w-full z-40 relative pt-6 pb-2 px-4 sm:px-8 flex flex-col items-center justify-center">
    <div class="w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between">
      <a href="https://miraginvest.com/">
        <div class="flex items-center space-x-3" data-aos="fade-right">
          <img src="https://images.miraginvest.com/miraglogo.png" alt="Mirag Logo" class="h-14 sm:h-16 w-auto">
          <span class="text-2xl sm:text-3xl font-mont font-bold tracking-tight" style="color:#4b00dd">
            MIRAG CONSULTING D.O.O.
          </span>
        </div>
      </a>
      <div class="hidden sm:flex font-mont text-base tracking-wide space-x-7">
        <span class="text-blue-400">20+ лет на рынке</span>
        <span class="text-gray-500">Эксперты: финансы, инжиниринг, недвижимость</span>
      </div>
    </div>
  </header>

'''

# ---------- Функции ----------------------------------------------------------

def clean_old_header(html: str) -> str:
    """Удаляем прежний header или кнопку «Назад», чтобы не задваивать."""
    html = re.sub(
        r'<!-- Шапка MIRAG[\s\S]*?<!-- Кнопка [\s\S]*?</div>\s*', '', html,
        flags=re.IGNORECASE
    )
    # html = re.sub(
    #     r'<a[^>]+>←\s*(?:Назад|На главную)[\s\S]*?</a>', '', html,
    #     flags=re.IGNORECASE
    # )
    return html

def ensure_head_assets(html: str) -> str:
    """Вставляем Tailwind, шрифты и стили, если их нет."""
    # Шрифты
    if "fonts.googleapis.com/css2?family=Montserrat" not in html:
        html = re.sub(r"</head>", FONTS_LINKS + "\n</head>", html, 1, flags=re.IGNORECASE)
    # Tailwind
    if "tailwind.min.css" not in html:
        html = re.sub(r"</head>", TAILWIND_LINK + "\n</head>", html, 1, flags=re.IGNORECASE)
    # Стили body + .font-mont
    if ".font-mont" not in html:
        html = re.sub(r"</head>", STYLE_BLOCK + "\n</head>", html, 1, flags=re.IGNORECASE)
    return html

def ensure_body_class(html: str) -> str:
    """Добавляем классы antialiased min-h-screen к тегу <body>."""
    def repl(match):
        tag = match.group(0)
        if 'class="' in tag:
            tag = re.sub(
                r'class="([^"]*)"',
                lambda m: f'class="{m.group(1)} antialiased min-h-screen"',
                tag,
                1
            )
        else:
            tag = tag[:-1] + ' class="antialiased min-h-screen">'
        return tag
    return re.sub(r"<body[^>]*>", repl, html, 1, flags=re.IGNORECASE)

def insert_header(html: str) -> str:
    """Добавляем шапку сразу после <body>."""
    return re.sub(
        r"(<body[^>]*>)",
        lambda m: m.group(1) + HEADER_HTML,
        html,
        1,
        flags=re.IGNORECASE
    )

def patch_file(path: Path):
    html = path.read_text(encoding="utf-8")

    html = clean_old_header(html)
    html = ensure_head_assets(html)
    html = ensure_body_class(html)
    html = insert_header(html)

    path.write_text(html, encoding="utf-8")
    print(f"✅  {path.relative_to(ARTICLES_ROOT)}")

# ---------- Запуск -----------------------------------------------------------

for html_file in ARTICLES_ROOT.rglob("index.html"):
    if html_file.parent == ARTICLES_ROOT:   # корневой список статей НЕ трогаем
        continue
    patch_file(html_file)
