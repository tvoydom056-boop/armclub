MVP: 24 PNG assets for the arm-wrestling game.

Folders: scene (4), opponents/boris (9), clasp (8), me (3).
Names and canvas sizes match C:/Users/DPiunov/Desktop/game/docs/art-brief.md.
Latest user-approved appearance overrides the old brief: lean athletic Boris,
slim neck, bald clean-shaven reference face, green hoodie, hood down.

All 23 object layers have real transparency. bg.png is fully opaque.
No magenta keying/removal script is required.
Checkerboards exist ONLY in the two preview images, not in the sprites.

_meta/contact-sheet.jpg: overview of all 24 images.
_meta/clasp-check.png: actual two-layer grip overlays for all four techniques.
_meta/manifest.json: sizes, anchors, registration and layer order.
_meta/validation.json: verified file dimensions and alpha ranges.
_meta/prompts.json: exact prompts, reference paths and original generation paths.
_meta/pack-assets.ps1: deterministic canvas sizing/registration and preview generation;
  rerunning it requires the locally stored original generated images.

Art was generated with the built-in image_gen tool. No CLI/API fallback was used.
Copy the four asset folders into public/art when integrating.
The game renderer and UI have not been modified. Final wrist seams, pivots and
in-game scale must be verified during integration; file checks are not a runtime test.
