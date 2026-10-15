"""Synthetic QA fixtures; never reads user documents."""
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

out = Path('tmp/advanced-qa')
image = Image.new('RGB', (1200, 1600), 'white')
draw = ImageDraw.Draw(image)
for y in range(40, 1550, 35):
    draw.text((45, y), f'Example scanned report line {y//35} Readability check 12345', fill='black', font_size=22)
image.save(out / 'sample.jfif', format='JPEG', quality=96)
second = Image.new('RGB', (800, 600), '#e6f0ff')
ImageDraw.Draw(second).text((45, 60), 'Second TIFF page', fill='black', font_size=35)
image.save(out / 'readable.tiff', save_all=True, append_images=[second], compression='tiff_lzw')
for compression in ['raw', 'tiff_adobe_deflate']:
    image.save(out / f'{compression}.tiff', compression=compression)
c = canvas.Canvas(str(out / 'scanned.pdf'), pagesize=(600, 800))
c.drawImage(ImageReader(image), 0, 0, width=600, height=800)
c.showPage()
c.save()
source = PdfReader(str(out / 'sample.pdf'))
for name, opening in [('restrictions', ''), ('password', 'known-fixture-password')]:
    writer = PdfWriter()
    for page in source.pages:
        writer.add_page(page)
    writer.encrypt(opening, 'fixture-owner-password', algorithm='AES-256', permissions_flag=0)
    with (out / f'{name}.pdf').open('wb') as stream:
        writer.write(stream)
print('Created readable LZW/Deflate TIFF, JFIF, scan and permission/password fixtures.')
