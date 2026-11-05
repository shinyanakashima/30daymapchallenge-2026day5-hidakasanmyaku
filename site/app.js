(async function () {
  const [stats, layers, peaksGeo] = await Promise.all([
    fetch('data/stats.json').then(r => r.json()),
    fetch('data/layers.json').then(r => r.json()),
    fetch('data/peaks.geojson').then(r => r.json())
  ]);
  const peaks = peaksGeo.features.map(f => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
  const N = peaks.length;
  const far = peaks.reduce((a, p) => (p.farthest_km > a.farthest_km ? p : a), peaks[0]);
  const [BW, BS, BE, BN] = stats.conditions.bbox_lonlat;
  const LABELED = ['memuro', 'poroshiri', 'tokachiporoshiri', 'kamuiekuuchikaushi', 'petegari', 'rakko', 'apoi'];
  const MID = ['tokachiporoshiri', 'rakko'];
  const LEFT = ['chiroro', 'tottabetsu', 'poroshiri', 'esaoman', 'kamuiekuuchikaushi', 'kamui', 'apoi'];

  const PLACES = [
    ['帯広', 'Obihiro', 143.1966, 42.9236], ['釧路', 'Kushiro', 144.3820, 42.9849],
    ['苫小牧', 'Tomakomai', 141.6056, 42.6342], ['旭川', 'Asahikawa', 142.3650, 43.7706],
    ['富良野', 'Furano', 142.3832, 43.3420], ['札幌', 'Sapporo', 141.3544, 43.0621],
    ['襟裳岬', 'Cape Erimo', 143.2489, 41.9255], ['浦河', 'Urakawa', 142.7681, 42.1686],
    ['広尾', 'Hiroo', 143.3117, 42.2869], ['新得', 'Shintoku', 142.8391, 43.0797],
    ['足寄', 'Ashoro', 143.5543, 43.2448], ['函館', 'Hakodate', 140.7288, 41.7687],
    ['室蘭', 'Muroran', 140.9738, 42.3152], ['小樽', 'Otaru', 140.9947, 43.1907],
    ['北見', 'Kitami', 143.8961, 43.8030], ['網走', 'Abashiri', 144.2737, 44.0206],
    ['根室', 'Nemuro', 145.5856, 43.3302], ['名寄', 'Nayoro', 142.4635, 44.3560],
    ['稚内', 'Wakkanai', 141.6730, 45.4156], ['青森', 'Aomori', 140.7400, 40.8244]
  ];

  const T = {
    ja: {
      title: '日本一広い国立公園は、どこから見える？',
      subtitle: '日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park',
      lead: s => `公園の陸域は東京都より広い。この公園の主な山頂${N}座のうち、どれか1座でも地形の上で見える場所を合わせると、公園の${s.ratio_park.toFixed(1)}倍、東京都の${s.ratio_tokyo.toFixed(1)}倍の広さになる。最も遠いのは岩手県の岩手山付近で、${far.name_ja}から約${Math.round(far.farthest_km)} km離れている。`,
      figPark: '公園の陸域面積', figTokyo: '東京都の面積', figVis: '主な山頂が1座でも見える場所の広さ',
      hint: '山頂の印をクリックすると、その山だけの見える範囲に切り替わります。地図上の地点にカーソルを乗せる（スマートフォンではタップする）と、そこから見える山の名前を表示し、見える山頂へ線を引きます。見えない山の印は薄くなります。「立体表示にする」で地形を立体で見られます（右ドラッグまたは2本指で傾きと向きを変えられます）。色の濃さを下げると下の地形が見えやすくなります。',
      notesTitle: '注記・計算の条件・出典',
      modeAll: `色の意味: その場所から、${N}座のうち何座の山頂が見えるか`,
      legendNone: '色の付いていない陸地からは、どの山頂も見えない',
      modePeak: (p, r) => `赤い場所に立つと、${p.name_ja}（${p.elev_m.toLocaleString()} m）の山頂が見える。その広さは${ha(p.visible_ha)}（公園の${r}倍）`,
      back: '全体に戻る', pickAll: '全15座をまとめて表示',
      to3d: '立体表示にする', to2d: '平面表示に戻す', opacity: '色の濃さ', rangeLbl: '計算範囲', parkKey: '日高山脈襟裳十勝国立公園の区域（概略）',
      legendLo: '1座', legendHi: N + '座すべて', single: p => `${p.name_ja}の山頂が見える場所`,
      tipNone: 'ここからは主な山頂が見えません', tipHead: n => `ここから見える山: ${n}座`,
      lang: 'English', ha: v => (v / 10000).toFixed(1) + '万ha',
      notes: () => `
<h3>見える範囲の意味</h3>
<p>標高データには木や建物が含まれていないため、地図の色は「地形の上で見える範囲」です。森林や建物による遮り、天気や霞は考慮していません。色の付いた地点に立った人（目の高さ1.6 m）から、山頂が地形に隠れずに見通せることを示します。</p>
<h3>計算の条件</h3>
<ul>
<li>方法: GDAL の gdal_viewshed で山頂ごとに可視領域を計算し、山ごとの結果をビットとして1枚にまとめた</li>
<li>観測点: 各山頂の地表（国土地理院の標高値の高さ）</li>
<li>目標の高さ: 地表から1.6 m</li>
<li>地球の丸みと大気差の補正: 係数 0.85714（屈折係数 0.13 相当）</li>
<li>標高データ: 国土地理院 標高タイル（DEM10B 由来、ズーム12、約28 m 間隔）を30 m 間隔に平均</li>
<li>計算範囲: 東経${BW}〜${BE}度、北緯${BS}〜${BN}度（北海道全体と青森県北部、地図の点線の枠）の陸地。見える土地が範囲の端に届いていないことを確認した。海は標高0 m として扱い、面積には含めない</li>
<li>最も遠く見える地点: 岩手山付近（${far.name_ja}から約${Math.round(far.farthest_km)} km）。見える土地のうち約2.0万haは本州北部にある</li>
<li>座標系: JGD2011 / UTM 第54帯（EPSG:6690）</li>
<li>立体表示: 同じ標高タイルから作った約110 m 間隔の標高を使い、高さを1.6倍に強調して表示</li>
</ul>
<h3>公園の区域</h3>
<p>緑の線は、環境省 生物多様性「見える化」マップの国立公園区域（原典: 環境省 EADAS 自然公園区域、令和6年6月25日告示の公園計画書・公園計画図・GISデータ）をもとに、地種区分をまとめて1つの区域にしたものです。原典は区域の概要を示すもので誤差を含みます（このデータでの面積は約25.4万ha）。面積の比較には環境省の公表値（陸域245,668 ha）を使っています。</p>
<h3>使った山頂（その山頂が見える場所の広さ）</h3>
<table>${peaks.map(p => `<tr><td>${p.name_ja}</td><td class="r">${p.elev_m.toLocaleString()} m</td><td class="r">${ha(p.visible_ha)}</td></tr>`).join('')}</table>
<h3>出典</h3>
<ul>
<li>標高タイル（背景の陰影図と立体表示もこれから作成）、日本の主な山岳標高（2026年3月31日版）: 出典 国土地理院</li>
<li>国立公園の指定日（2024年6月25日）・陸域面積（245,668 ha）: 環境省 報道発表資料、日高山脈襟裳十勝国立公園の指定概要</li>
<li>東京都の面積（219,405 ha）: 国土地理院 全国都道府県市区町村別面積調</li>
<li>公園の区域: 出典 環境省 生物多様性「見える化」マップ（https://www.biodiversitymap.env.go.jp/ ）を加工して作成（地種区分を統合し、線を単純化）</li>
</ul>
<p><a href="https://github.com/shinyanakashima/30daymapchallenge-2026day5-hidakasanmyaku">計算スクリプト（GitHub）</a></p>`
    },
    en: {
      title: "Where can you see Japan's largest national park from?",
      subtitle: '日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park',
      lead: s => `The park's land area is larger than Tokyo. All the places from which at least one of its ${N} main peaks can be seen, by terrain alone, add up to ${s.ratio_park.toFixed(1)} times the park and ${s.ratio_tokyo.toFixed(1)} times Tokyo. The farthest such point is near Mount Iwate in Iwate Prefecture, about ${Math.round(far.farthest_km)} km from ${far.name_en}.`,
      figPark: 'Park land area', figTokyo: 'Area of Tokyo', figVis: 'Area of places that can see at least one main peak',
      hint: 'Click a peak marker to show the area that sees that peak only. Hover over the map (tap on a phone) to list the peaks visible from that point; lines are drawn to the visible summits and the other peak markers fade. "Show in 3D" drapes the map over the terrain (right-drag or two fingers to tilt and rotate). Lower the colour opacity to see more of the terrain.',
      notesTitle: 'Notes, method and sources',
      modeAll: `Colour: how many of the ${N} peaks can be seen from each place`,
      legendNone: 'Uncoloured land cannot see any of them',
      modePeak: (p, r) => `Stand anywhere in red and you can see the summit of ${p.name_en} (${p.elev_m.toLocaleString()} m). That area is ${ha(p.visible_ha)} (${r} times the park)`,
      back: 'Show all', pickAll: 'All 15 peaks combined',
      to3d: 'Show in 3D', to2d: 'Back to 2D', opacity: 'Colour opacity', rangeLbl: 'Calculation extent', parkKey: 'Hidakasanmyaku-Erimo-Tokachi National Park (approximate)',
      legendLo: '1 peak', legendHi: 'all ' + N, single: p => `Places that can see the summit of ${p.name_en}`,
      tipNone: 'No main peak visible from here', tipHead: n => `Peaks visible from here: ${n}`,
      lang: '日本語', ha: v => Math.round(v).toLocaleString('en') + ' ha',
      notes: () => `
<h3>What "visible" means</h3>
<p>The elevation data has no trees or buildings, so the colours show what is visible over bare terrain. Forest, buildings, weather and haze are not taken into account. A coloured point means a person standing there (eye height 1.6 m) has a line of sight to the summit that is not blocked by terrain.</p>
<h3>Method</h3>
<ul>
<li>Viewsheds computed with GDAL gdal_viewshed for each summit, combined into one raster with one bit per peak</li>
<li>Observer: on the ground at each summit (GSI summit elevation)</li>
<li>Target height: 1.6 m above ground</li>
<li>Earth curvature and refraction: coefficient 0.85714 (refraction coefficient 0.13)</li>
<li>Elevation: GSI elevation tiles (from DEM10B, zoom 12, about 28 m spacing), averaged to a 30 m grid</li>
<li>Extent: land within ${BW}–${BE}°E, ${BS}–${BN}°N (all of Hokkaido and northern Aomori; dashed outline on the map). No visible land reaches the edge of this extent. The sea is treated as 0 m and excluded from areas</li>
<li>Farthest visible point: near Mount Iwate, about ${Math.round(far.farthest_km)} km from ${far.name_en}. About 20,000 ha of the visible land is in northern Honshu</li>
<li>Projection: JGD2011 / UTM zone 54N (EPSG:6690)</li>
<li>3D view: elevation from the same tiles at about 110 m spacing, with heights exaggerated 1.6 times</li>
</ul>
<h3>Park boundary</h3>
<p>The green line is the national park area from the Ministry of the Environment Biodiversity Map (original data: Ministry of the Environment EADAS natural park areas, based on the park plan and GIS data announced on 25 June 2024), with all zones merged into one area. The original data shows the outline only and contains errors (about 254,000 ha in this data). Area comparisons use the Ministry's published land area of 245,668 ha.</p>
<h3>Peaks used (area of places that can see each summit)</h3>
<table>${peaks.map(p => `<tr><td>${p.name_en}<br><span style="color:#777">${p.name_ja}</span></td><td class="r">${p.elev_m.toLocaleString()} m</td><td class="r">${ha(p.visible_ha)}</td></tr>`).join('')}</table>
<h3>Sources</h3>
<ul>
<li>Elevation tiles (also used to make the background hillshade and the 3D terrain) and major mountain elevations of Japan (31 March 2026 edition): Geospatial Information Authority of Japan (GSI)</li>
<li>Designation date (25 June 2024) and land area (245,668 ha): Ministry of the Environment, Japan</li>
<li>Area of Tokyo (219,405 ha): GSI, area statistics by prefecture and municipality</li>
<li>Park boundary: created by editing data from the Ministry of the Environment Biodiversity Map (https://www.biodiversitymap.env.go.jp/), with zones merged and lines simplified</li>
</ul>
<p><a href="https://github.com/shinyanakashima/30daymapchallenge-2026day5-hidakasanmyaku">Scripts on GitHub</a></p>`
    }
  };

  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') === 'en' ? 'en' : params.get('lang') === 'ja' ? 'ja' : (navigator.language || '').startsWith('ja') ? 'ja' : 'en';
  let selected = null;
  const ha = v => T[lang].ha(v);

  const narrow = window.matchMedia('(max-width: 640px)').matches;
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        hs: { type: 'raster', tiles: ['tiles/hs/{z}/{x}/{y}.webp'], tileSize: 256, minzoom: 6, maxzoom: 11,
          bounds: layers.bounds,
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>' },
        count: { type: 'raster', tiles: ['tiles/count/{z}/{x}/{y}.png'], tileSize: 256, minzoom: layers.countZoom[0], maxzoom: layers.countZoom[1], bounds: layers.bounds },
        peak: { type: 'image', url: `data/peak_${peaks[0].id}.png`, coordinates: layers.coordinates },
        range: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...layers.coordinates, layers.coordinates[0]] } } },
        park: { type: 'geojson', data: 'data/park.geojson' },
        sight: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        dem: { type: 'raster-dem', tiles: ['tiles/dem/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, minzoom: 6, maxzoom: 10, bounds: layers.bounds }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#dfe5ea' } },
        { id: 'hs', type: 'raster', source: 'hs', paint: { 'raster-opacity': 1 } },
        { id: 'vis-count', type: 'raster', source: 'count', paint: { 'raster-opacity': 0.7, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } },
        { id: 'vis-peak', type: 'raster', source: 'peak', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } },
        { id: 'range', type: 'line', source: 'range', paint: { 'line-color': '#5b6168', 'line-width': 1.2, 'line-dasharray': [4, 3] } },
        { id: 'park-fill', type: 'fill', source: 'park', paint: { 'fill-color': '#00a651', 'fill-opacity': 0.22 } },
        { id: 'park-casing', type: 'line', source: 'park', layout: { 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-opacity': 0.95, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 7] } },
        { id: 'park-line', type: 'line', source: 'park', layout: { 'line-join': 'round' },
          paint: { 'line-color': '#00873e', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3.5] } },
        { id: 'sight-casing', type: 'line', source: 'sight', filter: ['==', ['geometry-type'], 'LineString'],
          layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 3.2, 'line-opacity': 0.75 } },
        { id: 'sight-line', type: 'line', source: 'sight', filter: ['==', ['geometry-type'], 'LineString'],
          layout: { 'line-cap': 'round' }, paint: { 'line-color': '#1f2328', 'line-width': 1.3 } },
        { id: 'sight-pt', type: 'circle', source: 'sight', filter: ['==', ['geometry-type'], 'Point'],
          paint: { 'circle-radius': 4.5, 'circle-color': '#1f2328', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } }
      ]
    },
    bounds: [[140.4, 41.3], [145.3, 44.4]],
    fitBoundsOptions: { padding: narrow ? { top: 150, bottom: 10, left: 10, right: 10 } : { top: 20, bottom: 20, left: 400, right: 20 } },
    maxBounds: [[layers.bounds[0] - 1, layers.bounds[1] - 0.6], [layers.bounds[2] + 1, layers.bounds[3] + 0.6]],
    minZoom: 6, maxZoom: 13,
    attributionControl: { compact: narrow }
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

  // place labels
  const placeEls = PLACES.map(([ja, en, lon, lat]) => {
    const el = document.createElement('div');
    el.className = 'place';
    new maplibregl.Marker({ element: el, anchor: 'left', offset: [-3, 0] }).setLngLat([lon, lat]).addTo(map);
    return { el, ja, en };
  });

  // calculation extent label
  const rangeEl = document.createElement('div');
  rangeEl.className = 'range-lbl';
  new maplibregl.Marker({ element: rangeEl, anchor: 'top-left', offset: [6, 4] }).setLngLat([layers.bounds[0], layers.bounds[3]]).addTo(map);

  // peak markers
  const peakEls = {};
  peaks.forEach(p => {
    const el = document.createElement('div');
    el.className = 'peak ' + (LEFT.includes(p.id) ? 'l' : 'r') + (LABELED.includes(p.id) ? (MID.includes(p.id) ? ' mid' : '') : ' minor');
    el.innerHTML = '<div class="hit"><div class="tri"></div></div><div class="nm"></div>';
    el.querySelector('.hit').addEventListener('click', e => { e.stopPropagation(); select(selected === p.id ? null : p.id); });
    el.querySelector('.hit').addEventListener('mouseenter', () => hideTip());
    new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lon, p.lat]).addTo(map);
    peakEls[p.id] = el;
  });
  function updateZoomLabels() {
    const z = map.getZoom();
    peaks.forEach(p => {
      const el = peakEls[p.id];
      el.classList.toggle('minor', !LABELED.includes(p.id) && z < 9.2);
    });
  }
  map.on('zoom', updateZoomLabels);

  // hover: small bit tiles loaded on demand
  const MZ = layers.maskZoom;
  const tileCache = new Map();
  let lastHover = null;
  function loadTile(key, x, y) {
    tileCache.set(key, null);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(im, 0, 0);
      tileCache.set(key, ctx.getImageData(0, 0, 256, 256).data);
      if (lastHover) showTip(lastHover);
    };
    im.onerror = () => tileCache.set(key, 'none');
    im.src = `tiles/mask/${MZ}/${x}/${y}.png`;
  }
  const [W, S, E, Nn] = layers.bounds;
  // returns bit mask, null (sea / outside), or undefined (tile still loading)
  function bitsAt(ll) {
    if (ll.lng < W || ll.lng > E || ll.lat < S || ll.lat > Nn) return null;
    const n = 2 ** MZ;
    const fx = (ll.lng + 180) / 360 * n;
    const r = ll.lat * Math.PI / 180;
    const fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
    const x = Math.floor(fx), y = Math.floor(fy);
    const key = x + '/' + y;
    if (!tileCache.has(key)) { loadTile(key, x, y); return undefined; }
    const d = tileCache.get(key);
    if (d === null) return undefined;
    if (d === 'none') return null;
    const i = (Math.floor((fy - y) * 256) * 256 + Math.floor((fx - x) * 256)) * 4;
    if (d[i + 2] !== 255) return null; // sea
    return (d[i] << 8) | d[i + 1];
  }
  const tip = document.getElementById('tip');
  const EMPTY = { type: 'FeatureCollection', features: [] };
  let sightOn = false;
  function setSight(ll, vis) {
    const src = map.getSource('sight');
    if (!src) return;
    if (!ll) {
      if (sightOn) src.setData(EMPTY);
      sightOn = false;
      peaks.forEach(p => peakEls[p.id].classList.remove('seen', 'unseen'));
      return;
    }
    const from = [ll.lng, ll.lat];
    src.setData({ type: 'FeatureCollection', features: [
      ...vis.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from, [p.lon, p.lat]] } })),
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: from } }
    ] });
    sightOn = true;
    const ids = new Set(vis.map(p => p.id));
    peaks.forEach(p => {
      peakEls[p.id].classList.toggle('seen', ids.has(p.id));
      peakEls[p.id].classList.toggle('unseen', !ids.has(p.id));
    });
  }
  function hideTip() { tip.hidden = true; lastHover = null; setSight(null); }
  function showTip(e) {
    lastHover = { lngLat: e.lngLat, point: e.point };
    const b = bitsAt(e.lngLat);
    if (b === undefined) return;
    if (b === null) { hideTip(); return; }
    const vis = peaks.filter(p => (b >> p.bit) & 1);
    setSight(e.lngLat, vis);
    const t = T[lang];
    tip.innerHTML = vis.length
      ? `<b>${t.tipHead(vis.length)}</b>` + vis.map(p => {
          const nm = lang === 'ja' ? p.name_ja : p.name_en;
          return p.id === selected ? `<u>${nm}</u>` : nm;
        }).join(lang === 'ja' ? '、' : ', ')
      : t.tipNone;
    tip.hidden = false;
    const rect = map.getContainer().getBoundingClientRect();
    let x = e.point.x + 14, y = e.point.y + 14;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > rect.width - 4) x = e.point.x - tw - 14;
    if (y + th > rect.height - 4) y = e.point.y - th - 14;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  const hoverable = window.matchMedia('(hover: hover)').matches;
  if (hoverable) {
    map.on('mousemove', showTip);
    map.on('mouseout', hideTip);
    map.on('dragstart', hideTip);
  } else {
    map.on('click', showTip);
    map.on('movestart', hideTip);
  }

  function select(id) {
    selected = id;
    if (id) map.getSource('peak').updateImage({ url: `data/peak_${id}.png`, coordinates: layers.coordinates });
    map.setLayoutProperty('vis-peak', 'visibility', id ? 'visible' : 'none');
    map.setLayoutProperty('vis-count', 'visibility', id ? 'none' : 'visible');
    Object.entries(peakEls).forEach(([k, el]) => el.classList.toggle('on', k === id));
    hideTip();
    render();
  }

  let parkOn = true;
  const parkKey = t => `<label class="single park-key"><input type="checkbox" id="parkToggle"${parkOn ? ' checked' : ''}><span class="pk"></span>${t.parkKey}</label>`;
  function setPark(on) {
    parkOn = on;
    ['park-fill', 'park-casing', 'park-line'].forEach(l => map.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none'));
  }
  function render() {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.title = t.title;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t[el.dataset.i18n]; el.textContent = typeof v === 'function' ? v(stats) : v; });
    document.getElementById('lead').textContent = t.lead(stats);
    document.getElementById('f-park').textContent = ha(stats.park_ha);
    document.getElementById('f-tokyo').textContent = ha(stats.tokyo_ha);
    document.getElementById('f-vis').textContent = ha(stats.visible_any_ha);
    document.getElementById('lang').textContent = t.lang;
    document.getElementById('notes-body').innerHTML = t.notes();
    const mode = document.getElementById('mode');
    const lg = document.getElementById('legend');
    if (selected) {
      const p = peaks.find(q => q.id === selected);
      mode.textContent = t.modePeak(p, (p.visible_ha / stats.park_ha).toFixed(1));
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t.back; b.onclick = () => select(null);
      mode.appendChild(b);
      lg.innerHTML = `<div class="single"><span class="sw"></span>${t.single(p)}</div>` + parkKey(t);
    } else {
      mode.textContent = t.modeAll;
      lg.innerHTML = '<div class="bar">' + Object.values(layers.colors).map(c => `<span style="background:${c}"></span>`).join('') +
        `</div><div class="ticks"><span>${t.legendLo}</span><span>${t.legendHi}</span></div><div class="none">${t.legendNone}</div>` + parkKey(t);
    }
    const pick = document.getElementById('pick');
    pick.innerHTML = `<option value="">${t.pickAll}</option>` + peaks.map(p =>
      `<option value="${p.id}">${lang === 'ja' ? p.name_ja + '（' + p.elev_m.toLocaleString() + ' m）' : p.name_en + ' (' + p.elev_m.toLocaleString() + ' m)'}</option>`).join('');
    pick.value = selected || '';
    peaks.forEach(p => {
      const el = peakEls[p.id];
      el.querySelector('.nm').textContent = lang === 'ja' ? p.name_ja : p.name_en.replace('Mount ', 'Mt. ');
      el.setAttribute('aria-label', lang === 'ja' ? p.name_ja : p.name_en);
    });
    rangeEl.textContent = t.rangeLbl;
    placeEls.forEach(o => { o.el.textContent = lang === 'ja' ? o.ja : o.en; });
    document.getElementById('btn3d').textContent = is3d ? t.to2d : t.to3d;
    document.getElementById('btn3d').setAttribute('aria-pressed', String(is3d));
    document.getElementById('opLbl').textContent = t.opacity;
    const c = document.getElementById('collapse');
    const min = document.getElementById('panel').classList.contains('min');
    c.textContent = lang === 'ja' ? (min ? '説明を開く' : '説明をたたむ') : (min ? 'Show details' : 'Hide details');
    c.setAttribute('aria-expanded', String(!min));
  }

  document.getElementById('pick').addEventListener('change', e => select(e.target.value || null));
  let is3d = false;
  const btn3d = document.getElementById('btn3d');
  btn3d.addEventListener('click', () => {
    is3d = !is3d;
    if (is3d) {
      map.setTerrain({ source: 'dem', exaggeration: 1.6 });
      map.easeTo({ center: [142.95, 42.62], zoom: narrow ? 7.9 : 8.5, pitch: 62, bearing: -70, duration: 1500,
        padding: narrow ? { top: 160, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: 0, left: 380, right: 0 } });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 800, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }
    hideTip();
    render();
  });
  document.getElementById('op').addEventListener('input', e => {
    ['vis-count', 'vis-peak'].forEach(l => map.setPaintProperty(l, 'raster-opacity', Number(e.target.value) / 100));
  });
  document.getElementById('legend').addEventListener('change', e => {
    if (e.target.id === 'parkToggle') setPark(e.target.checked);
  });
  document.getElementById('lang').addEventListener('click', () => {
    lang = lang === 'ja' ? 'en' : 'ja';
    const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    render();
  });
  document.getElementById('collapse').addEventListener('click', () => {
    document.getElementById('panel').classList.toggle('min'); render();
  });
  if (narrow) document.getElementById('panel').classList.add('min');

  render();
  updateZoomLabels();
})();
