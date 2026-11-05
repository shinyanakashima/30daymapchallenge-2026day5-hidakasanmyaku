"""3D 表示用の標高タイル（Terrarium 形式 PNG）を作る。海とデータなしは 0 m。

入力: work/dem_z13.tif（Web メルカトル, ズーム13相当）
出力: site/tiles/dem/{z}/{x}/{y}.png（ズーム6〜10）
"""
import math
import os

import numpy as np
import rasterio
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "work", "dem_z13.tif")
OUT = os.path.join(ROOT, "site", "tiles", "dem")
ZMIN, ZMAX = 6, 10
SRC_Z = 13
WEST, EAST, SOUTH, NORTH = 141.0, 144.7, 41.7, 44.1


def lon2x(lon, z):
    return int((lon + 180) / 360 * 2**z)


def lat2y(lat, z):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2**z)


def encode(h):
    v = np.clip(h + 32768.0, 0, 65535.99)
    r = np.floor(v / 256)
    g = np.floor(v - r * 256)
    b = np.floor((v - r * 256 - g) * 256)
    return np.dstack([r, g, b]).astype(np.uint8)


def main():
    with rasterio.open(SRC) as ds:
        # 元ラスタの左上がどのズーム13タイルに当たるか
        res = ds.transform.a
        origin = math.pi * 6378137.0
        sx0 = round((ds.transform.c + origin) / res)
        sy0 = round((origin - ds.transform.f) / res)
        dem = ds.read(1)
    dem = np.where(np.isnan(dem), 0, dem).astype(np.float32)
    H, W = dem.shape
    n = 0
    for z in range(ZMIN, ZMAX + 1):
        f = 2 ** (SRC_Z - z)  # このズームの1画素 = 元の f×f 画素
        for x in range(lon2x(WEST, z), lon2x(EAST, z) + 1):
            for y in range(lat2y(NORTH, z), lat2y(SOUTH, z) + 1):
                px0 = x * 256 * f - sx0
                py0 = y * 256 * f - sy0
                size = 256 * f
                buf = np.zeros((size, size), dtype=np.float32)
                ax0, ay0 = max(px0, 0), max(py0, 0)
                ax1, ay1 = min(px0 + size, W), min(py0 + size, H)
                if ax0 >= ax1 or ay0 >= ay1:
                    continue
                buf[ay0 - py0:ay1 - py0, ax0 - px0:ax1 - px0] = dem[ay0:ay1, ax0:ax1]
                tile = buf.reshape(256, f, 256, f).mean(axis=(1, 3))
                d = os.path.join(OUT, str(z), str(x))
                os.makedirs(d, exist_ok=True)
                Image.fromarray(encode(tile), "RGB").save(os.path.join(d, f"{y}.png"), optimize=True)
                n += 1
    print(n, "tiles")


if __name__ == "__main__":
    main()
