#!/usr/bin/env python3
"""Join rendered PDF pages and the visually reviewed catalog.

Display order is Lee's explicitly selected cover-directory order. PDF page
numbers remain unchanged, and every original page must occur exactly once.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
rendered = json.loads((ROOT / 'data/rendered-pages.json').read_text())
review = json.loads((ROOT / 'data/catalog-review.json').read_text())
assert rendered['sha256'] == review['sha256']
assert rendered['pageCount'] == review['page_count'] == 42

ids = {'album': 'editorial', 'exhibition': 'exhibition', 'ppt': 'presentation', 'brochure': 'brochure', 'poster': 'other'}
titles = {'editorial': ('画册设计', 'Editorial'), 'exhibition': ('展陈设计', 'Exhibition'), 'presentation': ('PPT 设计', 'Presentation'), 'brochure': ('折页设计', 'Brochure'), 'other': ('其他设计', 'Other designs')}
order = ['editorial', 'exhibition', 'presentation', 'brochure', 'other']
sections = {ids[s['id']]: s for s in review['sections']}
groups = [{
    'id': g['id'], 'title': g['title'], 'kind': g['kind'],
    'categoryId': ids[g['section_id']],
    'pageNumbers': list(range(g['start_page'], g['end_page'] + 1)),
} for g in review['groups']]
categories = [{
    'id': 'overview', 'title': '作品集封面', 'english': 'Portfolio',
    'pages': [1], 'pageNumbers': [1], 'projects': [],
}]
for category_id in order:
    section = sections[category_id]
    numbers = list(range(section['start_page'], section['end_page'] + 1))
    title, english = titles[category_id]
    categories.append({
        'id': category_id, 'title': title, 'english': english,
        'sourceTitle': section['title'],
        'subtitle': '海报设计' if category_id == 'other' else '',
        'pages': numbers, 'pageNumbers': numbers,
        'projects': [g for g in groups if g['categoryId'] == category_id],
    })
reviewed = {p['page']: p for p in review['pages']}
pages = []
for page in rendered['pages']:
    label = reviewed[page['number']]
    pages.append({
        'number': page['number'], 'kind': label['kind'],
        'categoryId': ids.get(label['section_id'], 'overview'),
        'projectId': label['group_id'], 'title': label['title'],
        'thumb': page['thumb'], 'image': page['image'],
        'width': page['width'], 'height': page['height'],
    })
reading_order = [n for category in categories for n in category['pageNumbers']]
assert len(reading_order) == 42 and sorted(reading_order) == list(range(1, 43))
hero_pages = {g['pageNumbers'][0] for g in groups} | {23, 24, 25, 37, 39, 42}
by_number = {p['number']: p for p in pages}
data = {
    'source': {
        'title': 'Lee 设计作品集', 'pageCount': 42, 'sha256': rendered['sha256'],
        'url': 'https://github.com/lee662607-sys/DESIGN/releases/download/portfolio-pdf/Lee-.2.pdf',
        'releaseUrl': 'https://github.com/lee662607-sys/DESIGN/releases/tag/portfolio-pdf',
    },
    'orderBasis': 'User selected cover directory order; original PDF page numbers retained',
    'categories': categories, 'projects': groups, 'pages': pages,
    'readingOrder': reading_order,
    'heroImages': [by_number[n]['thumb'] for n in reading_order if n in hero_pages],
}
for page in pages:
    for key in ['thumb', 'image']:
        assert (ROOT / page[key]).is_file(), page
(ROOT / 'data/portfolio.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'portfolio-data.js').write_text('window.LEE_PORTFOLIO = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Catalog order:', ' → '.join(c['title'] for c in categories))
print('All PDF pages:', len(pages), '; distinct pages in reading order:', len(set(reading_order)))
print('Hero uses real PDF page thumbnails:', len(data['heroImages']))
