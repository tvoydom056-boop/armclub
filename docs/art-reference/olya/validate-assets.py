"""Inspect exported PNG assets; never changes image pixels."""
from pathlib import Path
import json
from PIL import Image, ImageChops

folder = Path('public/art/opponents/olya')
heads = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press']
expected = {f'head_{key}.png': (600, 700) for key in heads}
expected.update({'torso_motion.png': (1572, 1001), 'arm_free.png': (560, 620),
                 'cuff.png': (151, 151), 'arms_motion.png': (1670, 941),
                 'bg_police.png': (1672, 941), 'concept.png': (1672, 941)})
results = []
for name, size in expected.items():
    with Image.open(folder / name) as image:
        assert image.size == size, (name, image.size, size)
        record = {'file': name, 'size': list(image.size),
                  'bytes': (folder / name).stat().st_size, 'mode': image.mode}
        if name not in ['bg_police.png', 'concept.png']:
            assert 'A' in image.getbands(), name
            alpha = image.getchannel('A')
            assert alpha.getextrema() == (0, 255), (name, alpha.getextrema())
            record['alpha_bbox'] = list(alpha.getbbox())
            solid = alpha.point(lambda value: 255 if value >= 128 else 0)
            record['visible_bbox'] = list(solid.getbbox())
            record['transparent_pixels'] = alpha.histogram()[0]
            if name.startswith('head_'):
                left, top, right, bottom = solid.getbbox()
                assert left > 0 and top > 0 and right < 600 and bottom < 700, name
        results.append(record)
images = []
for key in heads:
    with Image.open(folder / f'head_{key}.png') as image:
        images.append(image.convert('RGBA'))
for index, image in enumerate(images):
    for other in images[:index]:
        assert ImageChops.difference(image, other).convert('RGB').getbbox(), 'duplicate head'
report = {'files': results, 'distinct_heads': True,
          'total_bytes': sum(record['bytes'] for record in results)}
Path('docs/art-reference/olya/asset-validation.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print('Verified 13 PNGs, 11 alpha-transparent sprites and 7 distinct 600x700 heads; visible head silhouettes have clear margins.')
