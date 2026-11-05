"""国土地理院 標高タイル（DEM10B 由来, PNG形式）を取得して GeoTIFF にまとめる。

出力: work/dem_src.tif（Web メルカトル, ズーム12, 約28 m 間隔）
"""
import math
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import numpy as np
import rasterio
import requests
from PIL import Image
from rasterio.transform import from_origin

Z = 12
# 計算範囲（経緯度）: 北海道全体と青森県北部。見える土地が範囲の端に届かない広さ
WEST, EAST, SOUTH, NORTH = 139.3, 146.0, 40.4, 45.6
URL = "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png"
WORK = os.path.join(os.path.dirname(__file__), "..", "work")
CACHE = os.path.join(WORK, f"tiles_z{Z}")
R = 6378137.0
ORIGIN = math.pi * R


def lon2x(lon):
    return int((lon + 180) / 360 * 2**Z)


def lat2y(lat):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**Z)


def decode(png):
    a = np.asarray(Image.open(BytesIO(png)).convert("RGB")).astype(np.int64)
    v = a[..., 0] * 65536 + a[..., 1] * 256 + a[..., 2]
    h = np.where(v < 2**23, v, v - 2**24).astype(np.float32) * 0.01
    h[v == 2**23] = np.nan
    return h


session = requests.Session()


def fetch(xy):
    x, y = xy
    path = os.path.join(CACHE, f"{x}_{y}.png")
    if os.path.exists(path):
        return xy, open(path, "rb").read() if os.path.getsize(path) else None
    for _ in range(4):
        try:
            r = session.get(URL.format(z=Z, x=x, y=y), timeout=30)
            if r.status_code == 404:
                open(path, "wb").close()
                return xy, None
            r.raise_for_status()
            open(path, "wb").write(r.content)
            return xy, r.content
        except requests.RequestException:
            continue
    raise RuntimeError(f"failed {x},{y}")


def main():
    os.makedirs(CACHE, exist_ok=True)
    x0, x1 = lon2x(WEST), lon2x(EAST)
    y0, y1 = lat2y(NORTH), lat2y(SOUTH)
    tiles = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    print(f"{len(tiles)} tiles", file=sys.stderr)
    W, H = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
    dem = np.full((H, W), np.nan, dtype=np.float32)
    with ThreadPoolExecutor(16) as ex:
        for i, ((x, y), png) in enumerate(ex.map(fetch, tiles)):
            if png:
                dem[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = decode(png)
            if i % 500 == 0:
                print(i, file=sys.stderr)
    res = 2 * ORIGIN / 2**Z / 256
    tr = from_origin(-ORIGIN + x0 * 256 * res, ORIGIN - y0 * 256 * res, res, res)
    with rasterio.open(os.path.join(WORK, "dem_src.tif"), "w", driver="GTiff", width=W, height=H,
                       count=1, dtype="float32", crs="EPSG:3857", transform=tr, nodata=np.nan,
                       compress="deflate", tiled=True) as dst:
        dst.write(dem, 1)


if __name__ == "__main__":
    main()
