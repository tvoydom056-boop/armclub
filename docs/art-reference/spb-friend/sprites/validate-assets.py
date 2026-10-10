"""Read-only checks for the generated Petersburg friend's PNG sprite package."""
from pathlib import Path
import json, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
FOLDER = ROOT / 'public/art/opponents/spb_friend'
HERE = Path(__file__).resolve().parent
EXPRESSIONS = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press']
LOGICAL = {f'head_{key}.png': (600, 700) for key in EXPRESSIONS}
LOGICAL.update({'torso_motion.png': (1572, 1001), 'arm_free.png': (560, 620),
                'cuff.png': (151, 151), 'arms_motion.png': (1670, 941)})
records = []
for name in [*LOGICAL, 'bg_neva.png', 'concept.png']:
    path = FOLDER / name
    with Image.open(path) as image:
        item = {'file': name, 'nativeSize': list(image.size), 'mode': image.mode,
                'bytes': path.stat().st_size,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        if name in LOGICAL or name == 'concept.png':
            assert 'A' in image.getbands(), name
            alpha = image.getchannel('A')
            assert alpha.getextrema() == (0, 255), (name, alpha.getextrema())
            item['transparentPixels'] = alpha.histogram()[0]
            item['visibleBBox'] = list(alpha.point(lambda value: 255 if value >= 128 else 0).getbbox())
        if name in LOGICAL:
            width, height = LOGICAL[name]
            item['logicalSize'] = [width, height]
            assert abs(image.width / image.height - width / height) < 0.002, (name, image.size)
            item['logicalVisibleBBox'] = [
                round(item['visibleBBox'][i] * (width / image.width if i % 2 == 0 else height / image.height), 2)
                for i in range(4)
            ]
        if name.startswith('head_'):
            left, top, right, bottom = item['visibleBBox']
            assert left > 0 and top > 0 and right < image.width and bottom < image.height, name
        records.append(item)
heads = [item for item in records if item['file'].startswith('head_')]
assert len(heads) == 7
assert len({item['sha256'] for item in heads}) == 7, 'Duplicate expression sprites'
master = next(item for item in heads if item['file'] == 'head_calm.png')
for item in heads:
    item['logicalSilhouetteDelta'] = [
        round(a - b, 2) for a, b in zip(item['logicalVisibleBBox'], master['logicalVisibleBBox'])
    ]
    assert max(abs(value) for value in item['logicalSilhouetteDelta']) <= 8, (
        item['file'], item['logicalSilhouetteDelta'])
frames = []
with Image.open(FOLDER / 'arms_motion.png') as atlas:
    assert atlas.size == (1670, 941), atlas.size
    alpha = atlas.getchannel('A')
    for index in range(9):
        col, row = index % 3, index // 3
        box = (round(col * atlas.width / 3), round(row * atlas.height / 3),
               round((col + 1) * atlas.width / 3), round((row + 1) * atlas.height / 3))
        frame_alpha = alpha.crop(box)
        assert frame_alpha.getextrema() == (0, 255), index
        frames.append({'frame': index, 'bounds': list(box),
                       'visibleBBox': list(frame_alpha.getbbox())})
report = {
    'files': records, 'transparentSpriteCount': 11, 'distinctExpressions': True,
    'headsLogicalCanvas': [600, 700], 'headsNativeCanvasVariants': sorted({tuple(item['nativeSize']) for item in heads}),
    'nativeHeadWidthDifferencePixels': max(item['nativeSize'][0] for item in heads) - min(item['nativeSize'][0] for item in heads),
    'atlasFrames': frames, 'totalBytes': sum(item['bytes'] for item in records),
    'integrationStatus': 'Assets generated; opponent registration and in-scene rig verification remain outside this sprite-generation task.',
    'renderingNote': 'Keep native PNG pixels; render every part in its listed logicalSize. Heads differ by one native pixel in width, which is normalized by the existing Swap logical-size rendering.'
}
(HERE / 'asset-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'files': len(records), 'transparentSprites': 11,
                  'headNativeSizes': report['headsNativeCanvasVariants'],
                  'headLogicalSize': report['headsLogicalCanvas'],
                  'maxLogicalSilhouetteDelta': max(abs(v) for item in heads for v in item['logicalSilhouetteDelta']),
                  'atlasFrames': len(frames)}, ensure_ascii=False))

