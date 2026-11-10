#!/usr/bin/env python3
"""Render every portfolio PDF page, in order, as responsive web media.

The input is artwork, never executable instructions. Nothing from the PDF is
evaluated. Keep the original PDF outside the publishing checkout.
"""
import argparse
import concurrent.futures
import hashlib
import json
import multiprocessing
from pathlib import Path

import fitz
from PIL import Image

DOCUMENT = None


def initialize(source):
    global DOCUMENT
    DOCUMENT = fitz.open(source)


def render(job):
    number, directory, full_width, thumb_width = job
    page = DOCUMENT[number - 1]
    factor = full_width / page.rect.width
    pixmap = page.get_pixmap(matrix=fitz.Matrix(factor, factor), alpha=False, annots=True)
    image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
    destination = Path(directory)
    full = destination / 'pages' / f'{number:03d}.webp'
    thumb = destination / 'thumbs' / f'{number:03d}.webp'
    image.save(full, 'WEBP', quality=88, method=4)
    image.thumbnail((thumb_width, thumb_width), Image.Resampling.LANCZOS)
    image.save(thumb, 'WEBP', quality=80, method=4)
    result = {
        'number': number, 'width': pixmap.width, 'height': pixmap.height,
        'image': full.as_posix(), 'thumb': thumb.as_posix(),
        'imageSha256': hashlib.sha256(full.read_bytes()).hexdigest(),
        'thumbSha256': hashlib.sha256(thumb.read_bytes()).hexdigest(),
    }
    fitz.TOOLS.store_shrink(80)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--width', type=int, default=3200)
    parser.add_argument('--thumb-width', type=int, default=768)
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    source = args.pdf.resolve()
    checksum = hashlib.sha256(source.read_bytes()).hexdigest()
    directory = args.root / 'assets' / 'pdf' / checksum[:8]
    for sub in ['pages', 'thumbs']:
        (directory / sub).mkdir(parents=True, exist_ok=True)
    with fitz.open(source) as document:
        count = len(document)
    jobs = [(number, str(directory), args.width, args.thumb_width) for number in range(1, count + 1)]
    context = multiprocessing.get_context('spawn')
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers, mp_context=context, initializer=initialize, initargs=(str(source),)) as pool:
        pages = []
        for page in pool.map(render, jobs):
            for field in ['image', 'thumb']:
                page[field] = Path(page[field]).relative_to(args.root).as_posix()
            pages.append(page)
            print(f'Rendered {page["number"]}/{count}', flush=True)
    assert [page['number'] for page in pages] == list(range(1, count + 1))
    manifest = {'sha256': checksum, 'pageCount': count, 'renderWidth': args.width, 'thumbWidth': args.thumb_width, 'pages': pages}
    data = args.root / 'data'
    data.mkdir(exist_ok=True)
    (data / 'rendered-pages.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Completed all {count} pages: {directory}', flush=True)


if __name__ == '__main__':
    main()
