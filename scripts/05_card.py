"""SNS 投稿用の画像（1200×1200）を作る。

入力: work/hs_byte.tif, work/count.tif, data/stats.json
出力: site/card.png
"""
import json
import math
import os
import subprocess

import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
WORK = os.path.join(ROOT, "work")
FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"  # IPA Pゴシック
R = 6378137.0
SIZE = 1200
HEAD = 215
MAP_H = SIZE - HEAD
WEST, EAST = 141.05, 144.65
CENTER_LAT = 42.64
SEA = (223, 229, 234)

STOPS = [(1, (253, 236, 178)), (4, (249, 168, 76)), (8, (217, 70, 58)), (11, (150, 30, 90)), (15, (60, 14, 80))]
PLACES = [("帯広", 143.1966, 42.9236), ("釧路", 144.3820, 42.9849), ("苫小牧", 141.6056, 42.6342),
          ("旭川", 142.3650, 43.7706), ("富良野", 142.3832, 43.3420), ("札幌", 141.3544, 43.0621),
          ("襟裳岬", 143.2489, 41.9255), ("浦河", 142.7681, 42.1686), ("広尾", 143.3117, 42.2869)]
LABEL = {"poroshiri": "l", "kamuiekuuchikaushi": "l", "petegari": "r", "tokachiporoshiri": "r",
         "memuro": "r", "rakko": "r", "apoi": "l"}


def ramp(n):
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        if a <= n <= b:
            t = (n - a) / (b - a)
            return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return STOPS[-1][1]


def mx(lon):
    return R * math.radians(lon)


def my(lat):
    return R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


X0, X1 = mx(WEST), mx(EAST)
RES = (X1 - X0) / SIZE
YC = my(CENTER_LAT)
Y1 = YC + RES * MAP_H / 2
Y0 = YC - RES * MAP_H / 2


def warp(src, dst, resampling, nodata):
    subprocess.run(["gdalwarp", "-overwrite", "-q", "-t_srs", "EPSG:3857", "-te", str(X0), str(Y0), str(X1), str(Y1),
                    "-ts", str(SIZE), str(MAP_H), "-r", resampling, "-dstnodata", str(nodata), src, dst], check=True)
    with rasterio.open(dst) as ds:
        return ds.read(1)


def px(lon, lat):
    return (mx(lon) - X0) / RES, HEAD + (Y1 - my(lat)) / RES


def main():
    stats = json.load(open(os.path.join(ROOT, "data", "stats.json"), encoding="utf-8"))
    n = len(stats["peaks"])
    hs = warp(os.path.join(WORK, "hs_byte.tif"), os.path.join(WORK, "card_hs.tif"), "average", 0)
    cnt = warp(os.path.join(WORK, "count.tif"), os.path.join(WORK, "card_count.tif"), "mode", 255)

    rgb = np.empty((MAP_H, SIZE, 3), dtype=np.float32)
    rgb[:] = SEA
    land = hs > 0
    g = hs.astype(np.float32) * 0.85 + 30
    for i in range(3):
        rgb[..., i] = np.where(land, g, rgb[..., i])
    lut = np.zeros((256, 3), dtype=np.float32)
    for k in range(1, n + 1):
        lut[k] = ramp(k)
    vis = (cnt >= 1) & (cnt <= n)
    a = 0.75
    rgb[vis] = rgb[vis] * (1 - a) + lut[cnt[vis]] * a

    img = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
    img.paste(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), (0, HEAD))
    d = ImageDraw.Draw(img)
    f = lambda s: ImageFont.truetype(FONT, s)

    def halo(xy, text, font, fill=(20, 20, 20), anchor="la"):
        d.text(xy, text, font=font, fill=fill, anchor=anchor, stroke_width=3, stroke_fill=(255, 255, 255))

    for name, lon, lat in PLACES:
        x, y = px(lon, lat)
        if y < HEAD + 15:
            continue
        d.ellipse((x - 3.5, y - 3.5, x + 3.5, y + 3.5), fill=(40, 40, 40))
        halo((x + 7, y), name, f(19), anchor="lm")
    for p in stats["peaks"]:
        x, y = px(float(p["lon"]), float(p["lat"]))
        d.polygon([(x, y - 8), (x - 6.5, y + 5), (x + 6.5, y + 5)], fill=(25, 25, 25), outline=(255, 255, 255))
        side = LABEL.get(p["id"])
        if side == "r":
            halo((x + 10, y), p["name_ja"], f(17), anchor="lm")
        elif side == "l":
            halo((x - 10, y), p["name_ja"], f(17), anchor="rm")

    # header
    d.text((40, 30), "日本一広い国立公園は、どこから見える？", font=f(46), fill=(25, 28, 32))
    d.text((42, 92), "日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park", font=f(20), fill=(90, 96, 104))
    vis_man = stats["visible_any_ha"] / 10000
    d.text((42, 132), f"公園の陸域 24.6万ha は東京都（21.9万ha）より広い。", font=f(24), fill=(25, 28, 32))
    d.text((42, 166), f"主な山頂{n}座のどれかが見える土地は {vis_man:.1f}万ha。公園の{stats['ratio_park']:.1f}倍、東京都の{stats['ratio_tokyo']:.1f}倍。",
           font=f(24), fill=(150, 48, 96))

    # legend
    lx, ly, w = 820, HEAD + 22, 340
    d.rectangle((lx - 14, ly - 12, lx + w + 14, ly + 70), fill=(255, 255, 255), outline=(210, 214, 218))
    d.text((lx, ly), "見える山の数", font=f(18), fill=(25, 28, 32))
    for k in range(1, n + 1):
        x = lx + (k - 1) * w / n
        d.rectangle((x, ly + 28, lx + k * w / n, ly + 44), fill=ramp(k))
    d.text((lx, ly + 48), "1座", font=f(15), fill=(90, 96, 104))
    d.text((lx + w, ly + 48), f"{n}座", font=f(15), fill=(90, 96, 104), anchor="ra")

    # footer
    far = max(p["farthest_km"] for p in stats["peaks"])
    lines = [
        "地形の上で見える範囲。木・建物・天気・霞は考慮していない。公園境界は描いていない。",
        f"条件: 目の高さ1.6 m、大気差係数0.85714、標高30 m 間隔、北海道全体と東北地方北部で計算（最も遠いのは岩手山付近、約{far:.0f} km）",
        "出典: 国土地理院（標高タイル、日本の主な山岳標高）、環境省（国立公園の指定日・面積）",
        "#30DayMapChallenge 2026 Day 5 Senses: Sight   shinyanakashima.github.io/30daymapchallenge-2026day5-hidakasanmyaku",
    ]
    fy = SIZE - 22 * len(lines) - 14
    d.rectangle((0, fy - 10, SIZE, SIZE), fill=(255, 255, 255))
    for i, t in enumerate(lines):
        d.text((40, fy + 22 * i), t, font=f(16), fill=(70, 76, 84))
    img.save(os.path.join(ROOT, "site", "card.png"), optimize=True)


if __name__ == "__main__":
    main()
