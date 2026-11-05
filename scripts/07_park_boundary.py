"""日高山脈襟裳十勝国立公園の区域を環境省 生物多様性「見える化」マップから取得し、1つの区域にまとめる。

原典: 環境省 EADAS 自然公園区域（環境省自然環境局国立公園課提供の公園計画書・公園計画図・GISデータ、令和6年6月25日告示）
出力: site/data/park.geojson（区域の外形, 経緯度）, data/park.json（面積など）
"""
import json
import os

import numpy as np
import requests
import shapely
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

ROOT = os.path.join(os.path.dirname(__file__), "..")
URL = "https://biodiversitymap.env.go.jp/server/rest/services/Hosted/F_02_02_02/FeatureServer/2020200/query"
NAME = "日高山脈襟裳十勝"


def main():
    feats, offset = [], 0
    while True:
        r = requests.get(URL, params={"where": f"名称='{NAME}'", "outFields": "objectid,名称,地域区,sa10_1_008,sa10_1_009",
                                      "returnGeometry": "true", "outSR": 4326, "f": "geojson",
                                      "resultOffset": offset, "resultRecordCount": 1000}, timeout=300)
        r.raise_for_status()
        fs = r.json()["features"]
        feats += fs
        if len(fs) < 1000:
            break
        offset += len(fs)
    print(len(feats), "polygons")
    t_utm = Transformer.from_crs("EPSG:4326", "EPSG:6690", always_xy=True)
    t_ll = Transformer.from_crs("EPSG:6690", "EPSG:4326", always_xy=True)
    to_utm = lambda c: np.column_stack(t_utm.transform(c[:, 0], c[:, 1]))
    to_ll = lambda c: np.column_stack(t_ll.transform(c[:, 0], c[:, 1]))
    transform = lambda fn, g: shapely.transform(g, fn)
    geoms = [transform(to_utm, shape(f["geometry"]).buffer(0)) for f in feats]
    park = unary_union(geoms)
    area_ha = park.area / 10000
    by_zone = {}
    for f, g in zip(feats, geoms):
        z = f["properties"]["地域区"]
        by_zone[z] = by_zone.get(z, 0) + g.area / 10000
    # Web 表示用に 20 m で単純化
    web = transform(to_ll, park.simplify(20, preserve_topology=True))
    json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": NAME},
                                                          "geometry": mapping(web)}]},
              open(os.path.join(ROOT, "site", "data", "park.geojson"), "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    info = {"name": NAME, "polygons": len(feats), "gis_area_ha": round(area_ha),
            "by_zone_ha": {k: round(v) for k, v in by_zone.items()},
            "designated": feats[0]["properties"]["sa10_1_008"]}
    json.dump(info, open(os.path.join(ROOT, "data", "park.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(info)


if __name__ == "__main__":
    main()
