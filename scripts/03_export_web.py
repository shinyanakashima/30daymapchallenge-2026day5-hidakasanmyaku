"""計算結果を Web 表示用の画像（EPSG:3857）と GeoJSON に書き出す。

出力: site/data/count.png（見える山の数, 着色済み）, site/data/peak_<id>.png（山ごと）,
      site/data/mask.png（ホバー用ビット, R=上位8bit G=下位8bit B=陸なら255）,
      site/data/layers.json, site/data/peaks.geojson, site/data/stats.json
"""
import json
import math
import os
import subprocess

import numpy as np
import rasterio
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
WORK = os.path.join(ROOT, "work")
OUT = os.path.join(ROOT, "site", "data")
WEST, EAST, SOUTH, NORTH = 141.0, 144.7, 41.7, 44.1
R = 6378137.0

# 見える山の数 1..15 の色（淡い黄 → 橙 → 赤 → 濃い紫）
STOPS = [(1, (253, 236, 178)), (4, (249, 168, 76)), (8, (217, 70, 58)), (11, (150, 30, 90)), (15, (60, 14, 80))]


def ramp(n):
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        if a <= n <= b:
            t = (n - a) / (b - a)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return STOPS[-1][1]


def merc(lon, lat):
    return R * math.radians(lon), R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def warp(src, dst, width, nodata=None):
    x0, y0 = merc(WEST, SOUTH)
    x1, y1 = merc(EAST, NORTH)
    h = round(width * (y1 - y0) / (x1 - x0))
    cmd = ["gdalwarp", "-overwrite", "-q", "-t_srs", "EPSG:3857", "-te", str(x0), str(y0), str(x1), str(y1),
           "-ts", str(width), str(h), "-r", "near"]
    if nodata is not None:
        cmd += ["-dstnodata", str(nodata)]
    subprocess.run(cmd + [src, dst], check=True)
    with rasterio.open(dst) as ds:
        return ds.read(1)


def main():
    os.makedirs(OUT, exist_ok=True)
    stats = json.load(open(os.path.join(ROOT, "data", "stats.json"), encoding="utf-8"))
    peaks = stats["peaks"]
    n = len(peaks)

    count = warp(os.path.join(WORK, "count.tif"), os.path.join(WORK, "count_3857.tif"), 4096, 255)
    idx = np.where((count >= 1) & (count <= n), count, 0).astype(np.uint8)
    pal = [0, 0, 0]
    for k in range(1, n + 1):
        pal += list(ramp(k))
    im = Image.fromarray(idx, "P")
    im.putpalette(pal)
    im.save(os.path.join(OUT, "count.png"), optimize=True, transparency=0)

    mask = warp(os.path.join(WORK, "mask.tif"), os.path.join(WORK, "mask_3857.tif"), 4096)
    for p in peaks:
        im = Image.fromarray(((mask >> p["bit"]) & 1).astype(np.uint8), "P")
        im.putpalette([0, 0, 0, 200, 40, 60])
        im.save(os.path.join(OUT, f"peak_{p['id']}.png"), optimize=True, transparency=0)

    small = warp(os.path.join(WORK, "mask.tif"), os.path.join(WORK, "mask_small.tif"), 2048)
    landsmall = warp(os.path.join(WORK, "count.tif"), os.path.join(WORK, "count_small.tif"), 2048, 255)
    m = np.zeros(small.shape + (3,), dtype=np.uint8)
    m[..., 0] = small >> 8
    m[..., 1] = small & 255
    m[..., 2] = np.where(landsmall != 255, 255, 0)
    Image.fromarray(m, "RGB").save(os.path.join(OUT, "mask.png"), optimize=True)

    json.dump({"bounds": [WEST, SOUTH, EAST, NORTH],
               "coordinates": [[WEST, NORTH], [EAST, NORTH], [EAST, SOUTH], [WEST, SOUTH]],
               "colors": {str(k): "#%02x%02x%02x" % ramp(k) for k in range(1, n + 1)}},
              open(os.path.join(OUT, "layers.json"), "w"), indent=1)
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [float(p["lon"]), float(p["lat"])]},
              "properties": {k: p[k] for k in ("id", "name_ja", "yomi", "name_en", "bit", "visible_ha")}
              | {"elev_m": int(p["elev_m"])}} for p in peaks]
    json.dump({"type": "FeatureCollection", "features": feats},
              open(os.path.join(OUT, "peaks.geojson"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(stats, open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    main()
