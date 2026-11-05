#!/bin/sh
# 陰影図タイル（背景）を標高タイルから作る。海はデータなし（透明）。
# 出力: site/tiles/hs/{z}/{x}/{y}.webp
set -e
cd "$(dirname "$0")/.."
gdaldem hillshade -q -multidirectional -z 1.6 -s 0.73 -compute_edges work/dem_src.tif work/hs_raw.tif
gdal_translate -q -ot Byte -scale 0 255 1 255 -a_nodata 0 work/hs_raw.tif work/hs_byte.tif
# 海（標高データなし）を透明にする
/usr/bin/python3.12 - <<'PY'
from osgeo import gdal
gdal.UseExceptions()
import numpy as np
d = gdal.Open("work/dem_src.tif"); h = gdal.Open("work/hs_byte.tif", gdal.GA_Update)
a = h.GetRasterBand(1).ReadAsArray(); z = d.GetRasterBand(1).ReadAsArray()
a[np.isnan(z)] = 0
h.GetRasterBand(1).WriteArray(a); h = None
PY
gdal_translate -q -of VRT -b 1 -b 1 -b 1 -a_nodata 0 work/hs_byte.tif work/hs_rgb.vrt
rm -rf site/tiles/hs
/usr/bin/python3.12 /usr/bin/gdal2tiles.py -q --xyz -z 6-11 -r average --tiledriver=WEBP --webp-quality=82 \
  --processes=4 -w none work/hs_rgb.vrt site/tiles/hs
