#!/usr/bin/env python3
"""Generate the Russian UI from the Turkish source; both read the same TR JSON."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
MESSAGES = json.loads((ROOT / 'scripts/locales/ru.json').read_text(encoding='utf-8'))


def translate(text):
    for source, target in sorted(MESSAGES.items(), key=lambda pair: len(pair[0]), reverse=True):
        text = text.replace(source, target)
    return text


def main():
    html = translate((SITE / 'index.html').read_text(encoding='utf-8'))
    html = html.replace('<html lang="tr">', '<html lang="ru">')
    html = html.replace('src="./app.js?', 'src="./app.ru.js?')
    html = html.replace('href="./" aria-label=', 'href="./ru.html" aria-label=')
    html = html.replace('data-language="tr" lang="tr" aria-current="page"', 'data-language="tr" lang="tr"')
    html = html.replace('data-language="ru" lang="ru"', 'data-language="ru" lang="ru" aria-current="page"')
    html = html.replace('Неактивных</span>', 'Неактивный</span>')
    (SITE / 'ru.html').write_text(html, encoding='utf-8')
    app = translate((SITE / 'app.js').read_text(encoding='utf-8'))
    app = app.replace("from './core.js?", "from './core.ru.js?")
    # Turkish player names continue to use Turkish case folding and sorting.
    app = app.replace("'tr-TR'", "'ru-RU'")
    for source, target in [
        ("[totals.free, 'Свободен']", "[totals.free, 'Свободны']"),
        ("[totals['likely-free'], 'Вероятно свободен']", "[totals['likely-free'], 'Вероятно свободны']"),
        ("[totals['likely-occupied'], 'Вероятно занято']", "[totals['likely-occupied'], 'Вероятно заняты']"),
        ("[totals.occupied, 'Занято']", "[totals.occupied, 'Заняты']"),
    ]:
        app = app.replace(source, target)
    (SITE / 'app.ru.js').write_text(app, encoding='utf-8')
    (SITE / 'core.ru.js').write_text(translate((SITE / 'core.js').read_text(encoding='utf-8')), encoding='utf-8')


if __name__ == '__main__':
    main()
