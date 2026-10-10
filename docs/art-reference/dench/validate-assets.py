"""Inspect Dench's PNG package and write a report; never changes image pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
FOLDER = ROOT / 'public/art/opponents/dench'
HERE = Path(__file__).resolve().parent
EXPRESSIONS = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press']
EXPECTED = {f'head_{key}.png': (600, 700) for key in EXPRESSIONS}
EXPECTED.update({'torso_motion.png': (1572, 1001), 'arm_free.png': (560, 620),
                 'cuff.png': (151, 151), 'arms_motion.png': (1670, 941)})
records = []
heads = []
head_boxes = []
for name, size in EXPECTED.items():
    path = FOLDER / name
    with Image.open(path) as image:
        assert image.size == size, (name, image.size, size)
        assert image.mode == 'RGBA', (name, image.mode)
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255), (name, alpha.getextrema())
        solid = alpha.point(lambda value: 255 if value >= 128 else 0)
        box = solid.getbbox()
        assert box, name
        record = {'file': name, 'size': list(size), 'mode': image.mode,
                  'visible_bbox': list(box), 'transparent_pixels': alpha.histogram()[0],
                  'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        if name.startswith('head_'):
            assert box[0] > 0 and box[1] > 0 and box[2] < size[0] and box[3] < size[1], (name, box)
            heads.append(image.convert('RGB'))
            head_boxes.append(box)
        if name == 'arms_motion.png':
            record['frames'] = []
            for index in range(9):
                col, row = index % 3, index // 3
                cell = (round(col * size[0] / 3), round(row * size[1] / 3),
                        round((col + 1) * size[0] / 3), round((row + 1) * size[1] / 3))
                frame_alpha = alpha.crop(cell)
                frame_solid = solid.crop(cell)
                assert frame_solid.getbbox(), ('empty arm frame', index)
                assert frame_alpha.histogram()[0] > 0, ('opaque arm frame', index)
                record['frames'].append({'index': index, 'bounds': list(cell),
                                         'visible_bbox': list(frame_solid.getbbox())})
        records.append(record)
for index, head in enumerate(heads):
    for earlier in heads[:index]:
        assert ImageChops.difference(head, earlier).getbbox(), 'Duplicate head expression'
max_head_bbox_drift = max(abs(a - b) for box in head_boxes for a, b in zip(box, head_boxes[0]))
assert max_head_bbox_drift <= 4, ('head registration drift', max_head_bbox_drift)
report = {'character': 'dench', 'sprite_count': len(EXPECTED), 'expressions': EXPRESSIONS,
          'distinct_heads': True, 'arm_pose_count': 9,
          'max_head_bbox_drift_px': max_head_bbox_drift, 'files': records,
          'total_bytes': sum(record['bytes'] for record in records)}
(HERE / 'asset-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'files'}))

