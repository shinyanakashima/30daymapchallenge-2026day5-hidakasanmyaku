"""各山頂の可視領域を gdal_viewshed で計算し、ビット合成・山の数・面積集計を行う。

入力: work/dem_src.tif, data/peaks.csv
出力: work/dem30.tif, work/vs_<id>.tif, work/mask.tif, work/count.tif, data/stats.json
"""
import csv
import json
import os
import subprocess

import numpy as np
import rasterio
from pyproj import Transformer

ROOT = os.path.join(os.path.dirname(__file__), "..")
WORK = os.path.join(ROOT, "work")
CRS = "EPSG:6690"  # JGD2011 / UTM zone 54N
RES = 30
EYE = 1.6          # 目標（人）の目の高さ m
CC = 0.85714       # 地球の丸みと大気差の補正係数（屈折係数 0.13 相当）
PARK_HA = 245668
TOKYO_HA = 219405
BBOX = [139.3, 39.3, 146.0, 45.6]  # 計算範囲（経緯度）: 北海道全体と東北地方北部
EDGE = 0.03  # 端の判定幅（度）


def run(cmd):
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def main():
    src = os.path.join(WORK, "dem_src.tif")
    dem30 = os.path.join(WORK, "dem30.tif")
    land = os.path.join(WORK, "dem30_land.tif")
    # 30 m 間隔に間引き（平均）して UTM へ
    run(["gdalwarp", "-overwrite", "-t_srs", CRS, "-tr", str(RES), str(RES), "-tap", "-r", "average",
         "-dstnodata", "-9999", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-multi", src, land])
    # 海（データなし）は標高 0 m として計算する
    with rasterio.open(land) as ds:
        prof = ds.profile
        a = ds.read(1)
    prof.update(nodata=None)
    with rasterio.open(dem30, "w", **prof) as d:
        d.write(np.where(a == -9999, 0, a).astype("float32"), 1)

    peaks = list(csv.DictReader(open(os.path.join(ROOT, "data", "peaks.csv"), encoding="utf-8")))
    tr = Transformer.from_crs("EPSG:6668", CRS, always_xy=True)

    with rasterio.open(land) as ds:
        landarr = ds.read(1)
        profile = ds.profile
        transform = ds.transform
    is_land = landarr != -9999
    del landarr
    mask = np.zeros(is_land.shape, dtype=np.uint16)
    out = []
    to_ll = Transformer.from_crs(CRS, "EPSG:6668", always_xy=True)
    with rasterio.open(src) as ds:
        b = ds.bounds
    ext = Transformer.from_crs("EPSG:3857", "EPSG:6668", always_xy=True)
    dw, ds_ = ext.transform(b.left, b.bottom)
    de, dn = ext.transform(b.right, b.top)
    print("DEM extent", dw, ds_, de, dn)
    for i, p in enumerate(peaks):
        x, y = tr.transform(float(p["lon"]), float(p["lat"]))
        r, c = rasterio.transform.rowcol(transform, x, y)
        with rasterio.open(land) as d:
            ground = float(d.read(1, window=((r, r + 1), (c, c + 1)))[0, 0])
        # 観測点は山頂の標高（国土地理院の値）の地表に置く
        oz = max(0.0, float(p["elev_m"]) - ground)
        vs = os.path.join(WORK, f"vs_{p['id']}.tif")
        run(["gdal_viewshed", "-ox", f"{x:.2f}", "-oy", f"{y:.2f}", "-oz", f"{oz:.2f}", "-tz", str(EYE),
             "-cc", str(CC), "-vv", "1", "-iv", "0", "-ov", "0", "-co", "COMPRESS=DEFLATE", dem30, vs])
        with rasterio.open(vs) as ds:
            v = (ds.read(1) == 1) & is_land
        mask |= (v.astype(np.uint16) << i)
        ha = int(v.sum()) * RES * RES / 10000
        rows, cols = np.nonzero(v)
        del v
        xs = transform.c + (cols + 0.5) * transform.a
        ys = transform.f + (rows + 0.5) * transform.e
        dist = np.hypot(xs - x, ys - y)
        k = int(dist.argmax())
        flon, flat = to_ll.transform(xs[k], ys[k])
        lon, lat = to_ll.transform(xs, ys)
        edge = int(((lon < dw + EDGE) | (lon > de - EDGE) | (lat < ds_ + EDGE) | (lat > dn - EDGE)).sum())
        out.append({**p, "bit": i, "visible_ha": round(ha), "observer_offset_m": round(oz, 1),
                    "farthest_km": round(float(dist[k]) / 1000, 1), "farthest_lonlat": [round(flon, 4), round(flat, 4)],
                    "edge_cells": edge})
        print(p["name_ja"], round(ha), "ha", "farthest", round(float(dist[k]) / 1000, 1), "km", "edge cells", edge)

    count = np.zeros(mask.shape, dtype=np.uint8)
    for i in range(len(peaks)):
        count += ((mask >> i) & 1).astype(np.uint8)
    profile.update(dtype="uint16", nodata=None, compress="deflate")
    with rasterio.open(os.path.join(WORK, "mask.tif"), "w", **profile) as d:
        d.write(mask, 1)
    profile.update(dtype="uint8", nodata=255)
    with rasterio.open(os.path.join(WORK, "count.tif"), "w", **profile) as d:
        d.write(np.where(is_land, count, 255).astype(np.uint8), 1)

    any_ha = int((count > 0)[is_land].sum()) * RES * RES / 10000
    land_ha = int(is_land.sum()) * RES * RES / 10000
    hist = {int(k): round(int((count == k)[is_land].sum()) * RES * RES / 10000) for k in range(len(peaks) + 1)}
    stats = {
        "visible_any_ha": round(any_ha),
        "calc_land_ha": round(land_ha),
        "park_ha": PARK_HA,
        "tokyo_ha": TOKYO_HA,
        "ratio_park": round(any_ha / PARK_HA, 2),
        "ratio_tokyo": round(any_ha / TOKYO_HA, 2),
        "count_hist_ha": hist,
        "conditions": {"eye_height_m": EYE, "curvature_coeff": CC, "dem_resolution_m": RES,
                       "crs": CRS, "bbox_lonlat": BBOX},
        "edge_cells_total": sum(p["edge_cells"] for p in out),
        "peaks": [{k: v for k, v in p.items()} for p in out],
    }
    json.dump(stats, open(os.path.join(ROOT, "data", "stats.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k != "peaks"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
