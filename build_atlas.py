#!/usr/bin/env python3
"""将 textures/ 下所有行星纹理拼成两张 sprite sheet，减少画质损失。"""
from PIL import Image
import os, json

TEX_DIR = os.path.join(os.path.dirname(__file__), 'textures')
CELL_W, CELL_H = 1024, 512
COLS = 5
PER_SHEET = COLS * 2  # 每张图 5列×2行 = 10个

keys = sorted(f for f in os.listdir(TEX_DIR) if f.endswith('.jpg'))
sheets = [keys[i:i + PER_SHEET] for i in range(0, len(keys), PER_SHEET)]
meta = {'cellW': CELL_W, 'cellH': CELL_H, 'sheets': []}

for si, sheet_keys in enumerate(sheets):
    rows = (len(sheet_keys) + COLS - 1) // COLS
    atlas = Image.new('RGB', (COLS * CELL_W, rows * CELL_H), (0, 0, 0))
    keys_meta = {}
    for i, fname in enumerate(sheet_keys):
        key = fname[:-4]
        r, c = divmod(i, COLS)
        img = Image.open(os.path.join(TEX_DIR, fname)).convert('RGB').resize((CELL_W, CELL_H), Image.LANCZOS)
        atlas.paste(img, (c * CELL_W, r * CELL_H))
        keys_meta[key] = {'x': c * CELL_W, 'y': r * CELL_H, 'w': CELL_W, 'h': CELL_H}

    out_img = os.path.join(TEX_DIR, f'atlas_{si}.jpg')
    atlas.save(out_img, 'JPEG', quality=85, optimize=True)
    meta['sheets'].append({'file': f'atlas_{si}.jpg', 'keys': keys_meta})
    print(f'atlas_{si}.jpg: {COLS*CELL_W}x{rows*CELL_H}, {len(sheet_keys)} textures, {os.path.getsize(out_img)//1024}KB')

with open(os.path.join(TEX_DIR, 'atlas.json'), 'w') as f:
    json.dump(meta, f)
print(f'共 {len(keys)} 张纹理，{len(sheets)} 张图集')
