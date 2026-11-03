import { classifyPlayer, lookupCoordinate, summarize, aggregateStatus, findPlanets, csvCell } from './core.js?v=20261103-lang-v1';

const $ = id => document.getElementById(id);
const state = { config: null, manifest: null, source: null, sourceNumber: 1, playerId: null,
  targets: new Set(), cache: new Map(), players: [], matches: [], highlight: -1,
  sourceRequest: 0, comparisonRequest: 0, result: null, busy: false };
const date = timestamp => new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
}).format(new Date(timestamp * 1000));

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function message(text, kind = '') { $('message').textContent = text; $('message').className = `message ${kind}`; }
function entries() { return state.manifest.universes; }
function selectedTargets() { return entries().filter(u => state.targets.has(u.number) && u.number !== state.sourceNumber); }
function updateButton() { $('check').disabled = state.busy || !state.playerId || !selectedTargets().length; }
function clearResult() {
  state.comparisonRequest++; state.result = null; state.busy = false;
  $('results').hidden = true; $('empty-state').hidden = false;
  $('check').textContent = 'Koordinatları kontrol et ↗';
}

async function loadUniverse(entry) {
  if (entry.state === 'unavailable') throw new Error(`${entry.name}: veri kaydı kullanılamıyor`);
  if (!state.cache.has(entry.number)) {
    const query = Object.values(entry.timestamps).join('-');
    state.cache.set(entry.number, (async () => {
      const response = await fetch(`${entry.file}?v=${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.schemaVersion !== 1 || data.community !== 'tr' || data.number !== entry.number || !data.players || !data.planets || !data.timestamps) throw new Error('Geçersiz veri biçimi');
      if (Object.keys(entry.timestamps).some(key => data.timestamps[key] !== entry.timestamps[key])) throw new Error('Veriler güncelleniyor. Sayfayı yenile.');
      return data;
    })().catch(error => { state.cache.delete(entry.number); throw error; }));
  }
  return state.cache.get(entry.number);
}

function renderTargets() {
  $('targets').replaceChildren();
  for (const universe of entries()) {
    const label = el('label', undefined, 'target-chip');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = universe.number;
    checkbox.checked = state.targets.has(universe.number) && universe.number !== state.sourceNumber;
    checkbox.disabled = universe.number === state.sourceNumber;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.targets.add(universe.number); else state.targets.delete(universe.number);
      clearResult(); updateTargetsCount(); updateButton();
      message('Evren seçimi değişti. Koordinatları kontrol et düğmesine bas.');
    });
    label.append(checkbox, el('span', universe.name + (checkbox.disabled ? ' · kendi evrenin' : '')));
    if (universe.state !== 'ok') label.title = universe.state === 'stale' ? 'Son güncelleme başarısız. Önceki veri kaydı kullanılıyor.' : 'API kaydı yok';
    $('targets').append(label);
  }
  updateTargetsCount();
}
function updateTargetsCount() { $('target-count').textContent = `· ${selectedTargets().length} evren`; }
function preset(name) {
  state.targets = new Set(name === 'none' ? [] : entries().map(u => u.number));
  clearResult(); renderTargets(); updateButton();
}

async function selectSource(number) {
  const request = ++state.sourceRequest;
  state.sourceNumber = number; state.source = null; state.playerId = null; state.players = [];
  clearResult(); closeOptions(); renderTargets(); updateButton();
  $('player-search').value = ''; $('player-search').disabled = true;
  $('selected-player').textContent = 'Oyuncular yükleniyor…';
  const entry = entries().find(u => u.number === number);
  message(`Yükleniyor: ${entry.name}…`);
  try {
    const snapshot = await loadUniverse(entry);
    if (request !== state.sourceRequest) return false;
    state.source = snapshot;
    state.players = Object.entries(snapshot.players).map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr') || Number(a.id) - Number(b.id));
    $('player-search').disabled = false;
    $('selected-player').textContent = `${state.players.length.toLocaleString('tr-TR')} oyuncu kayıtlı · harita ${date(snapshot.timestamps.universe)} UTC`;
    message(entry.state === 'stale' ? 'API güncellenemedi. Önceki veri kaydı kullanılıyor.' : 'Oyuncu adını yaz ve listeden seç.', entry.state === 'stale' ? 'warning' : '');
    return true;
  } catch (error) {
    if (request !== state.sourceRequest) return false;
    $('selected-player').textContent = 'Oyuncu listesi kullanılamıyor.';
    message(`Yüklenemedi: ${entry.name}. ${error.message}. Evreni yeniden seçmeyi dene.`, 'error');
    return false;
  }
}

function closeOptions() {
  $('player-options').hidden = true; $('player-search').setAttribute('aria-expanded', 'false');
  $('player-search').removeAttribute('aria-activedescendant'); state.highlight = -1;
}
function selectPlayer(id) {
  const player = state.source?.players[id]; if (!player) return;
  state.playerId = id; $('player-search').value = player.name; closeOptions(); clearResult();
  const planets = findPlanets(state.source, id);
  const label = $('selected-player'); label.replaceChildren(el('strong', player.name), document.createTextNode(`${player.rank ? ` · sıra ${player.rank}` : ''} · ID ${id} · gezegen: ${planets.length} · ${classifyPlayer(player).label}`));
  updateButton();
  message(planets.length ? 'Oyuncu seçildi. Koordinatları kontrol edebilirsin.' : 'Harita kaydında bu oyuncunun gezegeni yok.', planets.length ? '' : 'warning');
}
function highlightMatch(index) {
  state.highlight = index;
  [...$('player-options').children].forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
  const item = $('player-options').children[index];
  if (item) { $('player-search').setAttribute('aria-activedescendant', item.id); item.scrollIntoView({ block: 'nearest' }); }
}
function showOptions() {
  if (!state.source) return;
  const query = $('player-search').value.trim().toLocaleLowerCase('tr');
  const matches = state.players.filter(p => p.name.toLocaleLowerCase('tr').includes(query) || p.id === query);
  matches.sort((a, b) => Number(b.name.toLocaleLowerCase('tr') === query) - Number(a.name.toLocaleLowerCase('tr') === query));
  state.matches = matches.slice(0, 40); state.highlight = -1;
  $('player-options').replaceChildren();
  state.matches.forEach((p, i) => {
    const option = el('li'); option.id = `player-option-${i}`; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
    option.append(el('span', p.name), el('small', `${p.rank ? `Sıra ${p.rank} · ` : ''}#${p.id} · ${classifyPlayer(p).label}`));
    option.addEventListener('mousedown', event => event.preventDefault());
    option.addEventListener('click', () => selectPlayer(p.id));
    $('player-options').append(option);
  });
  if (!state.matches.length) { const li = el('li', 'Oyuncu bulunamadı. İsmin bir bölümünü veya ID numarasını dene.'); li.setAttribute('role', 'presentation'); $('player-options').append(li); }
  $('player-options').hidden = false; $('player-search').setAttribute('aria-expanded', 'true');
}

function renderSummary(summary) {
  const td = el('td', undefined, 'summary');
  const status = aggregateStatus(summary);
  td.append(el('span', status.label, `summary-total aggregate-${status.key}`));
  if (summary.unknown || summary.other || summary.unavailable) {
    td.title = 'Bilinmeyen durumlar, özel işaretler veya eksik veriler var. Koordinatın boş olduğu doğrulanamıyor.';
  }
  if (summary.occupied) {
    const counts = el('div', undefined, 'summary-counts');
    [['active', 'Aktif'], ['inactive', 'İnaktif'], ['vacation', 'Tatil']].forEach(([key, label]) => counts.append(el('span', `${label}: ${summary[key]}`)));
    if (summary.unknown) counts.append(el('span', `Bilinmiyor: ${summary.unknown}`));
    if (summary.other) counts.append(el('span', `Diğer durum: ${summary.other}`));
    td.append(counts);
  }
  if (summary.unavailable) td.append(el('span', `Veri yok: ${summary.unavailable}`, 'summary-warning'));
  if (summary.outside) td.append(el('span', `Evren dışında: ${summary.outside}`, 'summary-warning'));
  return td;
}

function renderResults(result) {
  const { player, planets, targets, datasets, rows } = result;
  $('results-title').textContent = player.name;
  $('results-description').textContent = `${state.source.name} · gezegen: ${planets.length} · karşılaştırılan evren: ${targets.length} · kendi evrenin hariç`;
  const totals = { free: 0, 'likely-free': 0, 'likely-occupied': 0, occupied: 0 };
  for (const row of rows) totals[aggregateStatus(row.summary).key]++;
  $('metrics').replaceChildren();
  for (const [number, text] of [[planets.length, 'Toplam koordinat'], [totals.free, 'Boş'], [totals['likely-free'], 'Muhtemelen boş'], [totals['likely-occupied'], 'Muhtemelen dolu'], [totals.occupied, 'Dolu']]) {
    const metric = el('div', undefined, 'metric'); metric.append(el('strong', String(number)), el('span', text)); $('metrics').append(metric);
  }
  const header = el('tr'); header.append(el('th', 'Koordinatlar', 'coord'), el('th', 'Özet', 'summary'));
  targets.forEach((universe, i) => {
    const th = el('th', universe.name, 'universe-col');
    th.append(el('small', datasets[i] ? `Harita ${date(datasets[i].timestamps.universe).split(',')[0]}` : 'Veri kaydı kullanılamıyor'));
    th.title = datasets[i] ? `Harita: ${date(datasets[i].timestamps.universe)} UTC\nDurumlar: ${date(datasets[i].timestamps.players)} UTC` : 'Veri yükleme hatası';
    header.append(th);
  });
  $('comparison').querySelector('thead').replaceChildren(header);
  const body = $('comparison').querySelector('tbody'); body.replaceChildren();
  for (const row of rows) {
    const tr = el('tr'); const coord = el('td', undefined, 'coord'); coord.append(el('strong', row.coords), el('small', row.planet.name));
    tr.append(coord, renderSummary(row.summary));
    row.cells.forEach(cell => {
      const td = el('td', undefined, `planet-cell ${cell.kind} ${cell.group || ''}`);
      if (cell.kind === 'occupied') {
        const name = el('div', undefined, 'player-name');
        name.append(el('strong', cell.name));
        if (cell.rank) {
          const rank = el('span', `Sıra ${cell.rank}`, 'player-rank');
          rank.title = `Toplam puan sırası: ${cell.rank}${cell.score != null ? ` · ${new Intl.NumberFormat('tr-TR').format(BigInt(cell.score))} puan` : ''}`;
          name.append(rank);
        }
        td.append(name);
        const status = el('div', undefined, 'cell-status'); status.append(el('i', undefined, `dot ${cell.group}`), el('span', cell.label)); td.append(status);
        td.title = `ID ${cell.playerId} · ${cell.planet.name}${cell.code ? ` · API: ${cell.code}` : ''}`;
      } else td.textContent = cell.label;
      tr.append(td);
    });
    body.append(tr);
  }
  $('freshness').replaceChildren();
  const sourceEntry = entries().find(e => e.number === state.sourceNumber);
  for (const [entry, dataset] of [[sourceEntry, state.source], ...targets.map((t, i) => [t, datasets[i]])]) {
    const item = el('div', undefined, 'freshness-item');
    item.append(el('strong', entry.name + (entry.number === state.sourceNumber ? ' · kendi evrenin' : '')));
    item.append(el('span', dataset ? `Harita: ${date(dataset.timestamps.universe)} UTC · durumlar: ${date(dataset.timestamps.players)} UTC · sıralama: ${dataset.timestamps.highscore ? `${date(dataset.timestamps.highscore)} UTC` : 'kullanılamıyor'}` : 'Veriler yüklenemedi. Doluluk durumu bilinmiyor.'));
    const link = el('a', 'API kaynağı ↗'); link.href = `${entry.api}universe.xml`; link.target = '_blank'; link.rel = 'noopener noreferrer'; item.append(link);
    if (entry.state === 'stale') item.append(el('em', 'Son güncelleme başarısız. Kaydedilmiş veriler gösteriliyor.'));
    $('freshness').append(item);
  }
  $('results').hidden = false; $('empty-state').hidden = true;
}

function shareUrl() {
  const url = new URL(location.href); url.search = ''; url.hash = '';
  url.searchParams.set('universe', state.sourceNumber); url.searchParams.set('player', state.playerId);
  url.searchParams.set('targets', selectedTargets().map(t => t.number).join(','));
  return url;
}

async function compare() {
  if (!state.source || !state.playerId || !selectedTargets().length || state.busy) return;
  const planets = findPlanets(state.source, state.playerId);
  if (!planets.length) { message('Harita kaydında bu oyuncunun gezegeni yok. Oyuncu harita güncellemesinden sonra katılmış olabilir.', 'warning'); return; }
  const request = ++state.comparisonRequest; state.busy = true; updateButton();
  $('check').textContent = 'Kontrol ediliyor…'; closeOptions(); message('Seçilen evrenlerin verileri yükleniyor…');
  const targets = selectedTargets();
  const loaded = await Promise.allSettled(targets.map(loadUniverse));
  if (request !== state.comparisonRequest) return;
  const datasets = loaded.map(r => r.status === 'fulfilled' ? r.value : null);
  const rows = planets.map(([coords, planet]) => {
    const cells = datasets.map(d => lookupCoordinate(d, coords)); return { coords, planet, cells, summary: summarize(cells) };
  });
  state.result = { player: state.source.players[state.playerId], planets, targets, datasets, rows };
  renderResults(state.result); state.busy = false; updateButton(); $('check').textContent = 'Koordinatları kontrol et ↗';
  const failed = datasets.filter(d => !d).length;
  const unknown = rows.reduce((s, r) => s + r.summary.unknown, 0);
  const stale = [entries().find(e => e.number === state.sourceNumber), ...targets].some(e => e.state === 'stale');
  const warning = [failed ? `Veri alınamayan evren sayısı: ${failed} ` : '', unknown ? `Durumu bilinmeyen konum sayısı: ${unknown} ` : '', stale ? 'Güncelleme hatası nedeniyle önceki kayıtlar kullanılıyor.' : ''].filter(Boolean).join(' ');
  message(warning || 'Hazır. Sonuçlar API haritasının tarihine aittir.', warning ? 'warning' : '');
  history.replaceState(null, '', shareUrl());
}

$('universe').addEventListener('change', () => selectSource(Number($('universe').value)));
document.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', () => {
  const url = new URL(link.dataset.language === 'ru' ? './ru.html' : './', location.href);
  url.search = location.search;
  if (state.manifest) {
    url.searchParams.set('universe', state.sourceNumber);
    if (state.playerId) url.searchParams.set('player', state.playerId);
    else url.searchParams.delete('player');
    url.searchParams.set('targets', selectedTargets().map(t => t.number).join(','));
  }
  link.href = url.href;
}));
$('player-search').addEventListener('input', () => { state.playerId = null; clearResult(); updateButton(); $('selected-player').textContent = 'Öneri listesinden bir oyuncu seç.'; showOptions(); });
$('player-search').addEventListener('focus', showOptions);
$('player-search').addEventListener('blur', closeOptions);
$('player-search').addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeOptions(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); if ($('player-options').hidden) showOptions();
    if (state.matches.length) highlightMatch((state.highlight + (event.key === 'ArrowDown' ? 1 : -1) + state.matches.length) % state.matches.length);
  } else if (event.key === 'Enter' && !$('player-options').hidden) {
    event.preventDefault();
    const match = state.matches[state.highlight >= 0 ? state.highlight : 0]; if (match) selectPlayer(match.id);
  }
});
$('search-form').addEventListener('submit', event => { event.preventDefault(); compare(); });
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { preset(button.dataset.preset); message('Evren seçimi değişti. Koordinatları kontrol et düğmesine bas.'); }));
$('example').addEventListener('click', async () => {
  const number = state.config.defaultUniverse;
  $('universe').value = String(number); preset('all');
  if (await selectSource(number)) {
    const example = Object.entries(state.source.players)
      .sort(([, a], [, b]) => (a.rank || Infinity) - (b.rank || Infinity))
      .find(([id]) => findPlanets(state.source, id).length > 0);
    if (example) { selectPlayer(example[0]); await compare(); }
    else message('Bu evrende örnek olarak gösterilebilecek gezegen bulunamadı.', 'warning');
  }
});
$('share').addEventListener('click', async () => {
  if (!state.result) return;
  try { await navigator.clipboard.writeText(shareUrl().href); $('share').textContent = 'Bağlantı kopyalandı'; setTimeout(() => { $('share').textContent = 'Bağlantıyı kopyala'; }, 2000); }
  catch { message('Bağlantı kopyalanamadı. Bu kontrolün bağlantısı adres çubuğunda bulunuyor.', 'warning'); }
});
$('export').addEventListener('click', () => {
  if (!state.result) return;
  const data = [['Koordinatlar', 'Evren', 'Doluluk', 'Oyuncu adı', 'Durum', 'API kodu', 'Oyuncu ID', 'Harita API UTC', 'Durum API UTC', 'Puan sırası', 'Puan', 'Sıralama API UTC']];
  state.result.rows.forEach(row => row.cells.forEach((cell, i) => {
    const snap = state.result.datasets[i];
    data.push([row.coords, state.result.targets[i].name, cell.kind === 'occupied' ? 'Dolu' : cell.label,
      cell.name || '', cell.kind === 'occupied' ? cell.label : '', cell.code || '', cell.playerId || '',
      snap ? new Date(snap.timestamps.universe * 1000).toISOString() : '', snap ? new Date(snap.timestamps.players * 1000).toISOString() : '',
      cell.rank || '', cell.score ?? '', snap?.timestamps.highscore ? new Date(snap.timestamps.highscore * 1000).toISOString() : '']);
  }));
  const blob = new Blob(['\uFEFF' + data.map(row => row.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = `ogame-tr-${state.sourceNumber}-${state.playerId}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function init() {
  try {
    const [response, configResponse] = await Promise.all([
      fetch('./data/manifest.json', { cache: 'no-store' }), fetch('./config.json', { cache: 'no-store' })
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!configResponse.ok) throw new Error(`HTTP ${configResponse.status}`);
    const config = await configResponse.json();
    if (config.community !== 'tr' || !config.universes?.length) throw new Error('Geçersiz Türkiye yapılandırması');
    state.config = config;
    const manifest = await response.json();
    if (manifest.schemaVersion !== 1 || manifest.community !== 'tr' || !manifest.universes?.length) throw new Error('Geçersiz evren listesi');
    const allowed = new Set(config.universes.map(u => u.number));
    manifest.universes = manifest.universes.filter(u => allowed.has(u.number));
    if (!manifest.universes.length) throw new Error('Birleşme listesinde evren bulunamadı');
    state.manifest = manifest;
    const params = new URLSearchParams(location.search);
    const desired = Number(params.get('universe') || config.defaultUniverse);
    state.sourceNumber = entries().some(e => e.number === desired) ? desired : entries().find(e => e.state !== 'unavailable').number;
    $('universe').replaceChildren(...entries().map(u => { const option = el('option', `${u.name} · TR ${u.number}${u.state === 'unavailable' ? ' · veri yok' : ''}`); option.value = u.number; return option; }));
    $('universe').value = String(state.sourceNumber); $('universe').disabled = false;
    $('example').disabled = !entries().some(e => e.number === config.defaultUniverse && e.state !== 'unavailable');
    const generated = date(Date.parse(manifest.generatedAt) / 1000);
    $('updated-at').textContent = `Veri toplama zamanı: ${generated} UTC`;
    preset('all');
    if (params.has('targets')) {
      const numbers = new Set(params.get('targets').split(',').map(Number));
      state.targets = new Set(entries().filter(u => numbers.has(u.number)).map(u => u.number)); renderTargets();
    }
    if (await selectSource(state.sourceNumber)) {
      const id = params.get('player');
      if (id && state.source.players[id]) { selectPlayer(id); await compare(); }
      else if (id) message('Bağlantıdaki oyuncu güncel API listesinde bulunamadı. Başka bir oyuncu seç.', 'warning');
    }
  } catch (error) { message(`Veriler yüklenemedi. ${error.message}. Lütfen daha sonra sayfayı yenile.`, 'error'); }
}
init();
