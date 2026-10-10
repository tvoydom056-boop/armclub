"""Read-only validation of Venya's exported production sprites."""
from pathlib import Path
import json
from PIL import Image, ImageChops

folder = Path('public/art/opponents/venya')
heads = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press']
expected = {f'head_{key}.png': (600, 700) for key in heads}
expected.update({'torso_motion.png': (1572, 1001), 'arm_free.png': (560, 620),
                 'cuff.png': (151, 151), 'arms_motion.png': (1670, 941)})
results = []
head_images = []
for name, size in expected.items():
    with Image.open(folder / name) as image:
        assert image.size == size, (name, image.size, size)
        assert 'A' in image.getbands(), name
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255), (name, alpha.getextrema())
        solid = alpha.point(lambda value: 255 if value >= 128 else 0)
        bbox = solid.getbbox()
        record = {'file': name, 'size': list(image.size), 'mode': image.mode,
                  'bytes': (folder / name).stat().st_size,
                  'visible_bbox': list(bbox), 'transparent_pixels': alpha.histogram()[0]}
        if name.startswith('head_'):
            left, top, right, bottom = bbox
            assert left > 0 and top > 0 and right < size[0] and bottom < size[1], (name, bbox)
            head_images.append(image.convert('RGBA'))
        if name == 'arms_motion.png':
            record['frames'] = []
            for i in range(9):
                col, row = i % 3, i // 3
                bounds = (round(col * size[0] / 3), round(row * size[1] / 3),
                          round((col + 1) * size[0] / 3), round((row + 1) * size[1] / 3))
                frame = alpha.crop(bounds)
                assert frame.getbbox(), ('empty arm pose', i)
                assert frame.histogram()[0] > 0, ('opaque arm pose background', i)
                record['frames'].append({'index': i, 'visible_bbox': list(frame.getbbox())})
        results.append(record)
for index, image in enumerate(head_images):
    for other in head_images[:index]:
        assert ImageChops.difference(image, other).convert('RGB').getbbox(), 'duplicate expression'
report = {'files': results, 'distinct_heads': True, 'arm_poses': 9,
          'total_bytes': sum(record['bytes'] for record in results)}
Path('docs/art-reference/venya/asset-validation.json').write_text(
    json.dumps(report, indent=2), encoding='utf8')
print('Verified 11 transparent PNGs, seven distinct heads and nine populated arm poses.')
