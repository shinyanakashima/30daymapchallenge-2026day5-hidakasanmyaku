# 日本一広い国立公園は、どこから見える？

**Where can you see Japan's largest national park from?**
日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park

#30DayMapChallenge 2026 Day 5「Senses: Sight」の作品です。

公開URL: https://shinyanakashima.github.io/30daymapchallenge-2026day5-hidakasanmyaku/

![screenshot](docs/screenshot.png)

## 概要

日高山脈襟裳十勝国立公園は、2024年6月25日に日高山脈襟裳国定公園を拡大して、国内35か所目の国立公園として指定されました。陸域の面積は245,668 haで、国立公園として国内最大、東京都（219,405 ha）より広い公園です。

この地図は、公園の中心である日高山脈の主な山頂15座が、地形の上でどこから見えるかを計算し、見える山の数を色で示したものです。

| 項目 | 面積 |
| --- | --- |
| 公園の陸域面積 | 245,668 ha |
| 東京都の面積 | 219,405 ha |
| 主な山頂が1座以上見える土地 | 1,031,574 ha（公園の4.2倍、東京都の4.7倍） |

地図の操作:

- 山頂の印をクリックする（またはパネルで山を選ぶ）と、その山だけの見える範囲に切り替わります。
- 地図上の地点にカーソルを乗せる（スマートフォンではタップする）と、そこから見える山の名前を表示し、見える山頂へ線を引きます。見えない山の印は薄くなります。
- 「立体表示にする」で、地形を立体にして見えている範囲を重ねて表示します（右ドラッグまたは2本指で傾きと向きを変えられます）。高さは1.6倍に強調しています。
- 「色の濃さ」で、色の透明度を変えて下の地形を見やすくできます。
- 右上のボタンで日本語と英語を切り替えます（`?lang=en` でも指定できます）。

SNS投稿用の画像: [site/card.png](site/card.png)

## 注記

- 標高データには木や建物が含まれていないため、「地形の上で見える範囲」です。森林や建物による遮り、天気や霞は考慮していません。
- 公園の区域境界は描いていません。OpenStreetMap には2024年の国立公園区域のデータが見つからず（`boundary=national_park` / `boundary=protected_area` を確認）、環境省 生物多様性センターのGISデータ（gis.biodic.go.jp）も今回の作業環境から取得できなかったためです。
- 山の英語名は、環境省の英語資料で使われている表記（Mount Apoi）に合わせ、ほかの山も同じ形式で国土地理院の読みから表記しました。

## 計算の条件

| 項目 | 値 |
| --- | --- |
| 計算方法 | GDAL `gdal_viewshed`（山頂ごとに計算し、山ごとの結果を1ビットずつ1枚のラスタにまとめた） |
| 観測点 | 各山頂の地表（国土地理院の標高値の高さ。30 m 格子の標高との差を観測点の高さとして与えた） |
| 目標の高さ | 地表から1.6 m |
| 地球の丸みと大気差の補正 | `-cc 0.85714`（屈折係数 0.13 相当） |
| 標高データ | 国土地理院 標高タイル（DEM10B 由来、PNG形式、ズーム13）を30 m 間隔に間引き（平均） |
| 計算範囲 | 東経141.0〜144.7度、北緯41.7〜44.1度（日高山脈からおよそ150 km）。海は標高0 m として扱い、面積には含めない |
| 座標系 | JGD2011 / UTM 第54帯（EPSG:6690） |

計算範囲の端まで届いている可視領域はありません（範囲の外側で切れていないことを確認済み）。

## 使った山頂

国土地理院「日本の主な山岳標高」（2026年3月31日版、CSV）から選んだ15座です。面積は、その山が見える陸地の面積です。

| 山名 | English | 標高 (m) | 緯度, 経度 | 見える土地 (ha) |
| --- | --- | ---: | --- | ---: |
| 芽室岳 | Mount Memuro | 1,753 | 42.868967, 142.785395 | 490,903 |
| チロロ岳 | Mount Chiroro | 1,880 | 42.825585, 142.675406 | 499,815 |
| ピパイロ岳 | Mount Pipairo | 1,916 | 42.773184, 142.72761 | 424,446 |
| 戸蔦別岳 | Mount Tottabetsu | 1,959 | 42.738665, 142.695107 | 483,183 |
| 幌尻岳 | Mount Poroshiri | 2,052 | 42.719435, 142.682894 | 566,952 |
| エサオマントッタベツ岳 | Mount Esaomantottabetsu | 1,902 | 42.689411, 142.757826 | 435,115 |
| 札内岳 | Mount Satsunai | 1,895 | 42.693848, 142.79675 | 407,897 |
| 十勝幌尻岳 | Mount Tokachi-Poroshiri | 1,846 | 42.695467, 142.859408 | 428,872 |
| カムイエクウチカウシ山 | Mount Kamuiekuuchikaushi | 1,979 | 42.625112, 142.766406 | 496,002 |
| １８３９峰 | Peak 1839 | 1,842 | 42.539346, 142.808116 | 442,655 |
| ペテガリ岳 | Mount Petegari | 1,736 | 42.499337, 142.871019 | 475,808 |
| 神威岳 | Mount Kamui | 1,600 | 42.428465, 142.906866 | 311,358 |
| ピリカヌプリ | Mount Pirikanupuri | 1,630 | 42.402225, 142.966802 | 488,910 |
| 楽古岳 | Mount Rakko | 1,471 | 42.272513, 143.111252 | 417,292 |
| アポイ岳 | Mount Apoi | 810 | 42.107849, 143.025658 | 55,330 |

## データと出典

- 標高タイル（DEM10B）、日本の主な山岳標高: 出典 国土地理院
  - https://maps.gsi.go.jp/development/ichiran.html
  - https://www.gsi.go.jp/kihonjohochousa/kihonjohochousa41139.html
- 国立公園の指定日・正式名称・面積: 環境省
  - https://www.env.go.jp/press/111250.html
  - https://www.env.go.jp/en/press/111250.html
  - https://www.env.go.jp/content/000233127.pdf（日高山脈襟裳十勝国立公園の指定概要）
- 東京都の面積: 国土地理院 全国都道府県市区町村別面積調
- 地図ライブラリ: MapLibre GL JS

## 再現手順

GDAL 3.8 以上（`gdal_viewshed`, `gdaldem`, `gdal2tiles.py`）と Python 3 を使います。

```bash
pip install -r requirements.txt
```

```bash
python3 scripts/01_fetch_dem.py
```

```bash
python3 scripts/02_viewshed.py
```

```bash
python3 scripts/03_export_web.py
```

```bash
sh scripts/04_hillshade_tiles.sh
```

```bash
python3 scripts/05_card.py
```

```bash
python3 scripts/06_terrain_tiles.py
```

| スクリプト | 内容 |
| --- | --- |
| `01_fetch_dem.py` | 標高タイルを取得して `work/dem_z13.tif` にまとめる |
| `02_viewshed.py` | 30 m 格子に変換し、山頂ごとの可視領域、ビット合成、見える山の数、面積集計（`data/stats.json`） |
| `03_export_web.py` | Web 表示用の画像（`site/data/`）を書き出す |
| `04_hillshade_tiles.sh` | 背景の陰影図タイル（`site/tiles/hs/`）を作る |
| `05_card.py` | SNS 投稿用の画像（`site/card.png`）を作る |
| `06_terrain_tiles.py` | 立体表示用の標高タイル（Terrarium 形式、`site/tiles/dem/`、ズーム6〜10）を作る |

中間ファイルは `work/` に置かれ、リポジトリには含めていません。公開しているのは計算済みの画像とタイルだけで、ブラウザでは可視領域の計算をしていません。

## ライセンス

コードは [MIT License](LICENSE)。データの利用条件は各出典に従います。
