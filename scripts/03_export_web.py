"""計算結果を Web 表示用のタイルと画像（EPSG:3857）に書き出す。

出力:
  site/tiles/count/{z}/{x}/{y}.png  見える山の数（着色済み, ズーム6〜11）
  site/tiles/mask/{z}/{x}/{y}.png   ホバー用（ズーム10, R=上位8bit G=下位8bit B=陸なら255）
  site/data/peak_<id>.png           山ごとの見える範囲（1枚画像）
  site/data/layers.json, site/data/peaks.geojson, site/data/stats.json
"""
import json
import math
import os
import shutil
import subprocess

import numpy as np
import rasterio
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
WORK = os.path.join(ROOT, "work")
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(SITE, "data")
R = 6378137.0
ORIGIN = math.pi * R
COUNT_Z = (6, 11)
MASK_Z = 10

# 見える山の数 1..15 の色（淡い黄 → 橙 → 赤 → 濃い紫）
STOPS = [(1, (253, 236, 178)), (4, (249, 168, 76)), (8, (217, 70, 58)), (11, (150, 30, 90)), (15, (60, 14, 80))]


def ramp(n):
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        if a <= n <= b:
            t = (n - a) / (b - a)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return STOPS[-1][1]


def lon2x(lon, z):
    return int((lon + 180) / 360 * 2**z)


def lat2y(lat, z):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**z)


def tile_range(bbox, z):
    w, s, e, n = bbox
    return lon2x(w, z), lon2x(e, z), lat2y(n, z), lat2y(s, z)


def warp_tiles(src, dst, bbox, z, nodata, resampling="near"):
    """ズーム z のタイル格子にぴったり合わせて 3857 へ変換し、配列と左上タイル番号を返す。"""
    x0, x1, y0, y1 = tile_range(bbox, z)
    size = 2 * ORIGIN / 2**z
    te = [-ORIGIN + x0 * size, ORIGIN - (y1 + 1) * size, -ORIGIN + (x1 + 1) * size, ORIGIN - y0 * size]
    w, h = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
    subprocess.run(["gdalwarp", "-overwrite", "-q", "-t_srs", "EPSG:3857", "-te", *map(str, te),
                    "-ts", str(w), str(h), "-r", resampling, "-dstnodata", str(nodata), src, dst], check=True)
    with rasterio.open(dst) as ds:
        return ds.read(1), x0, y0


def warp_image(src, dst, bbox, width, nodata=None):
    w, s, e, n = bbox
    mx = lambda lon: R * math.radians(lon)
    my = lambda lat: R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    h = round(width * (my(n) - my(s)) / (mx(e) - mx(w)))
    cmd = ["gdalwarp", "-overwrite", "-q", "-t_srs", "EPSG:3857", "-te", str(mx(w)), str(my(s)), str(mx(e)), str(my(n)),
           "-ts", str(width), str(h), "-r", "near"]
    if nodata is not None:
        cmd += ["-dstnodata", str(nodata)]
    subprocess.run(cmd + [src, dst], check=True)
    with rasterio.open(dst) as ds:
        return ds.read(1)


def palette_png(idx, pal, path):
    im = Image.fromarray(idx, "P")
    im.putpalette(pal)
    im.save(path, optimize=True, transparency=0)


def main():
    os.makedirs(OUT, exist_ok=True)
    stats = json.load(open(os.path.join(ROOT, "data", "stats.json"), encoding="utf-8"))
    bbox = stats["conditions"]["bbox_lonlat"]
    peaks = stats["peaks"]
    n = len(peaks)
    pal = [0, 0, 0]
    for k in range(1, n + 1):
        pal += list(ramp(k))

    # 見える山の数のタイル
    tdir = os.path.join(SITE, "tiles", "count")
    shutil.rmtree(tdir, ignore_errors=True)
    zmin, zmax = COUNT_Z
    for z in range(zmin, zmax + 1):
        cnt, ax0, ay0 = warp_tiles(os.path.join(WORK, "count.tif"), os.path.join(WORK, "count_tiles.tif"), bbox, z, 255)
        arr = np.where((cnt >= 1) & (cnt <= n), cnt, 0).astype(np.uint8)
        tx0, tx1, ty0, ty1 = tile_range(bbox, z)
        for tx in range(tx0, tx1 + 1):
            for ty in range(ty0, ty1 + 1):
                t = arr[(ty - ay0) * 256:(ty - ay0 + 1) * 256, (tx - ax0) * 256:(tx - ax0 + 1) * 256]
                d = os.path.join(tdir, str(z), str(tx))
                os.makedirs(d, exist_ok=True)
                palette_png(t, pal, os.path.join(d, f"{ty}.png"))

    # ホバー用のビットタイル（ズーム10）
    mdir = os.path.join(SITE, "tiles", "mask")
    shutil.rmtree(mdir, ignore_errors=True)
    m, mx0, my0 = warp_tiles(os.path.join(WORK, "mask.tif"), os.path.join(WORK, "mask_tiles.tif"), bbox, MASK_Z, 0)
    land, _, _ = warp_tiles(os.path.join(WORK, "count.tif"), os.path.join(WORK, "land_tiles.tif"), bbox, MASK_Z, 255)
    rgb = np.zeros(m.shape + (3,), dtype=np.uint8)
    rgb[..., 0] = m >> 8
    rgb[..., 1] = m & 255
    rgb[..., 2] = np.where(land != 255, 255, 0)
    tx0, tx1, ty0, ty1 = tile_range(bbox, MASK_Z)
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            t = rgb[(ty - my0) * 256:(ty - my0 + 1) * 256, (tx - mx0) * 256:(tx - mx0 + 1) * 256]
            d = os.path.join(mdir, str(MASK_Z), str(tx))
            os.makedirs(d, exist_ok=True)
            Image.fromarray(t, "RGB").save(os.path.join(d, f"{ty}.png"), optimize=True)

    # 山ごとの見える範囲（1枚画像）
    for f in os.listdir(OUT):
        if f.startswith("peak_") or f in ("count.png", "mask.png"):
            os.remove(os.path.join(OUT, f))
    pm = warp_image(os.path.join(WORK, "mask.tif"), os.path.join(WORK, "mask_img.tif"), bbox, 4096, 0)
    for p in peaks:
        palette_png(((pm >> p["bit"]) & 1).astype(np.uint8), [0, 0, 0, 200, 40, 60],
                    os.path.join(OUT, f"peak_{p['id']}.png"))

    w, s, e, nn = bbox
    json.dump({"bounds": bbox,
               "coordinates": [[w, nn], [e, nn], [e, s], [w, s]],
               "countZoom": list(COUNT_Z), "maskZoom": MASK_Z,
               "colors": {str(k): "#%02x%02x%02x" % ramp(k) for k in range(1, n + 1)}},
              open(os.path.join(OUT, "layers.json"), "w"), indent=1)
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [float(p["lon"]), float(p["lat"])]},
              "properties": {k: p[k] for k in ("id", "name_ja", "yomi", "name_en", "bit", "visible_ha", "farthest_km")}
              | {"elev_m": int(p["elev_m"])}} for p in peaks]
    json.dump({"type": "FeatureCollection", "features": feats},
              open(os.path.join(OUT, "peaks.geojson"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(stats, open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    main()
