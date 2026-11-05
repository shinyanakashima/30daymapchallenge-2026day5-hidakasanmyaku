(async function () {
  const [stats, layers, peaksGeo] = await Promise.all([
    fetch('data/stats.json').then(r => r.json()),
    fetch('data/layers.json').then(r => r.json()),
    fetch('data/peaks.geojson').then(r => r.json())
  ]);
  const peaks = peaksGeo.features.map(f => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
  const N = peaks.length;
  const LABELED = ['memuro', 'poroshiri', 'tokachiporoshiri', 'kamuiekuuchikaushi', 'petegari', 'rakko', 'apoi'];
  const MID = ['tokachiporoshiri', 'rakko'];
  const LEFT = ['chiroro', 'tottabetsu', 'poroshiri', 'esaoman', 'kamuiekuuchikaushi', 'kamui', 'apoi'];

  const PLACES = [
    ['帯広', 'Obihiro', 143.1966, 42.9236], ['釧路', 'Kushiro', 144.3820, 42.9849],
    ['苫小牧', 'Tomakomai', 141.6056, 42.6342], ['旭川', 'Asahikawa', 142.3650, 43.7706],
    ['富良野', 'Furano', 142.3832, 43.3420], ['札幌', 'Sapporo', 141.3544, 43.0621],
    ['襟裳岬', 'Cape Erimo', 143.2489, 41.9255], ['浦河', 'Urakawa', 142.7681, 42.1686],
    ['広尾', 'Hiroo', 143.3117, 42.2869], ['新得', 'Shintoku', 142.8391, 43.0797],
    ['足寄', 'Ashoro', 143.5543, 43.2448]
  ];

  const T = {
    ja: {
      title: '日本一広い国立公園は、どこから見える？',
      subtitle: '日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park',
      lead: s => `公園の陸域は東京都より広い。主な山頂${N}座のうち1座以上が地形の上で見える土地は、公園の${s.ratio_park}倍、東京都の${s.ratio_tokyo}倍になる。`,
      figPark: '公園の陸域面積', figTokyo: '東京都の面積', figVis: `主な山頂が1座以上見える土地`,
      hint: '山頂の印をクリックすると、その山だけの見える範囲に切り替わります。地図上の地点にカーソルを乗せる（スマートフォンではタップする）と、そこから見える山の名前を表示します。「立体表示にする」で地形を立体で見られます（右ドラッグまたは2本指で傾きと向きを変えられます）。色の濃さを下げると下の地形が見えやすくなります。',
      notesTitle: '注記・計算の条件・出典',
      modeAll: '色: 見える山の数（全' + N + '座）',
      modePeak: (p, r) => `${p.name_ja}（${p.elev_m.toLocaleString()} m）が見える土地: ${ha(p.visible_ha)}（公園の${r}倍）`,
      back: '全体に戻る', pickAll: '全15座をまとめて表示',
      to3d: '立体表示にする', to2d: '平面表示に戻す', opacity: '色の濃さ',
      legendLo: '1座', legendHi: N + '座', single: '見える土地',
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
<li>標高データ: 国土地理院 標高タイル（DEM10B 由来、ズーム13）を30 m 間隔に間引き（平均）</li>
<li>計算範囲: 東経141.0〜144.7度、北緯41.7〜44.1度（日高山脈からおよそ150 km）の陸地。海は標高0 m として扱い、面積には含めない</li>
<li>座標系: JGD2011 / UTM 第54帯（EPSG:6690）</li>
<li>立体表示: 同じ標高タイルから作った約100 m 間隔の標高を使い、高さを1.6倍に強調して表示</li>
</ul>
<h3>公園の区域</h3>
<p>公園の区域境界は描いていません。OpenStreetMap には2024年の国立公園区域のデータが見つからず、環境省のGISデータも今回は取得できなかったためです。面積の比較は環境省資料の数値によります。</p>
<h3>使った山頂（見える土地の面積）</h3>
<table>${peaks.map(p => `<tr><td>${p.name_ja}</td><td class="r">${p.elev_m.toLocaleString()} m</td><td class="r">${ha(p.visible_ha)}</td></tr>`).join('')}</table>
<h3>出典</h3>
<ul>
<li>標高タイル、陰影起伏図、日本の主な山岳標高（2026年3月31日版）: 出典 国土地理院</li>
<li>国立公園の指定日（2024年6月25日）・陸域面積（245,668 ha）: 環境省 報道発表資料、日高山脈襟裳十勝国立公園の指定概要</li>
<li>東京都の面積（219,405 ha）: 国土地理院 全国都道府県市区町村別面積調</li>
</ul>
<p><a href="https://github.com/shinyanakashima/30daymapchallenge-2026day5-hidakasanmyaku">計算スクリプト（GitHub）</a></p>`
    },
    en: {
      title: "Where can you see Japan's largest national park from?",
      subtitle: '日高山脈襟裳十勝国立公園 / Hidakasanmyaku-Erimo-Tokachi National Park',
      lead: s => `The park's land area is larger than Tokyo. Land from which at least one of its ${N} main peaks can be seen, by terrain alone, is ${s.ratio_park} times the park and ${s.ratio_tokyo} times Tokyo.`,
      figPark: 'Park land area', figTokyo: 'Area of Tokyo', figVis: 'Land that sees at least one main peak',
      hint: 'Click a peak marker to show the area that sees that peak only. Hover over the map (tap on a phone) to list the peaks visible from that point. "Show in 3D" drapes the map over the terrain (right-drag or two fingers to tilt and rotate). Lower the colour opacity to see more of the terrain.',
      notesTitle: 'Notes, method and sources',
      modeAll: `Colour: number of peaks visible (of ${N})`,
      modePeak: (p, r) => `Land that sees ${p.name_en} (${p.elev_m.toLocaleString()} m): ${ha(p.visible_ha)} (${r} times the park)`,
      back: 'Show all', pickAll: 'All 15 peaks combined',
      to3d: 'Show in 3D', to2d: 'Back to 2D', opacity: 'Colour opacity',
      legendLo: '1 peak', legendHi: N + ' peaks', single: 'Visible land',
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
<li>Elevation: GSI elevation tiles (from DEM10B, zoom 13), averaged to a 30 m grid</li>
<li>Extent: land within 141.0–144.7°E, 41.7–44.1°N (about 150 km around the Hidaka Mountains). The sea is treated as 0 m and excluded from areas</li>
<li>Projection: JGD2011 / UTM zone 54N (EPSG:6690)</li>
<li>3D view: elevation from the same tiles at about 100 m spacing, with heights exaggerated 1.6 times</li>
</ul>
<h3>Park boundary</h3>
<p>The park boundary is not drawn. OpenStreetMap has no data for the 2024 national park area, and the Ministry of the Environment GIS data could not be obtained for this map. Area comparisons use the Ministry's published figures.</p>
<h3>Peaks used (visible land area)</h3>
<table>${peaks.map(p => `<tr><td>${p.name_en}<br><span style="color:#777">${p.name_ja}</span></td><td class="r">${p.elev_m.toLocaleString()} m</td><td class="r">${ha(p.visible_ha)}</td></tr>`).join('')}</table>
<h3>Sources</h3>
<ul>
<li>Elevation tiles, hillshade tiles, and major mountain elevations of Japan (31 March 2026 edition): Geospatial Information Authority of Japan (GSI)</li>
<li>Designation date (25 June 2024) and land area (245,668 ha): Ministry of the Environment, Japan</li>
<li>Area of Tokyo (219,405 ha): GSI, area statistics by prefecture and municipality</li>
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
        vis: { type: 'image', url: 'data/count.png', coordinates: layers.coordinates },
        dem: { type: 'raster-dem', tiles: ['tiles/dem/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, minzoom: 6, maxzoom: 10, bounds: layers.bounds }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#dfe5ea' } },
        { id: 'hs', type: 'raster', source: 'hs', paint: { 'raster-opacity': 1 } },
        { id: 'vis', type: 'raster', source: 'vis', paint: { 'raster-opacity': 0.7, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } }
      ]
    },
    bounds: [[141.2, 41.85], [144.55, 43.95]],
    fitBoundsOptions: { padding: narrow ? { top: 150, bottom: 10, left: 10, right: 10 } : { top: 20, bottom: 20, left: 400, right: 20 } },
    maxBounds: [[140.2, 41.2], [145.5, 44.6]],
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

  // hover mask
  let maskData = null, mW = 0, mH = 0;
  const img = new Image();
  img.onload = () => {
    mW = img.naturalWidth; mH = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = mW; c.height = mH;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    maskData = ctx.getImageData(0, 0, mW, mH).data;
  };
  img.src = 'data/mask.png';
  const R = 6378137;
  const mx = lon => R * lon * Math.PI / 180;
  const my = lat => R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const [W, S, E, Nn] = layers.bounds;
  const X0 = mx(W), X1 = mx(E), Y0 = my(S), Y1 = my(Nn);
  function bitsAt(ll) {
    if (!maskData) return null;
    const px = Math.floor((mx(ll.lng) - X0) / (X1 - X0) * mW);
    const py = Math.floor((Y1 - my(ll.lat)) / (Y1 - Y0) * mH);
    if (px < 0 || py < 0 || px >= mW || py >= mH) return null;
    const i = (py * mW + px) * 4;
    if (maskData[i + 2] !== 255) return null; // sea
    return (maskData[i] << 8) | maskData[i + 1];
  }
  const tip = document.getElementById('tip');
  function hideTip() { tip.hidden = true; }
  function showTip(e) {
    const b = bitsAt(e.lngLat);
    if (b === null) { hideTip(); return; }
    const vis = peaks.filter(p => (b >> p.bit) & 1);
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
    map.getSource('vis').updateImage({ url: id ? `data/peak_${id}.png` : 'data/count.png', coordinates: layers.coordinates });
    Object.entries(peakEls).forEach(([k, el]) => el.classList.toggle('on', k === id));
    hideTip();
    render();
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
      lg.innerHTML = `<div class="single"><span class="sw"></span>${t.single}</div>`;
    } else {
      mode.textContent = t.modeAll;
      lg.innerHTML = '<div class="bar">' + Object.values(layers.colors).map(c => `<span style="background:${c}"></span>`).join('') +
        `</div><div class="ticks"><span>${t.legendLo}</span><span>${t.legendHi}</span></div>`;
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
    map.setPaintProperty('vis', 'raster-opacity', Number(e.target.value) / 100);
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
