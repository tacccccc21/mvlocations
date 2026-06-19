// --- 行キーと住所を事前計算して保存（DOM構造変更前に実施） ---
document.querySelectorAll('.loc-table tbody tr').forEach(row => {
  const song = row.querySelector('.song')?.textContent.trim() || '';
  const loc = row.cells[1]?.textContent.trim() || '';
  const addr = row.querySelector('.addr')?.textContent.trim() || '';
  row.dataset.rowKey = song + '__' + loc;
  row.dataset.locText = loc;
  row.dataset.addrText = addr;
});

function getRowKey(row) {
  return row.dataset.rowKey || '';
}

// --- お気に入り管理 ---
const FAV_KEY = 'mvloc_favorites';
let favorites = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));

function saveFavorites() {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
}

function makeFavTd(key) {
  const isFav = favorites.has(key);
  const td = document.createElement('td');
  td.className = 'fav-cell';
  td.setAttribute('data-label', '');
  const btn = document.createElement('button');
  btn.className = 'fav-btn' + (isFav ? ' fav-active' : '');
  btn.setAttribute('aria-label', 'お気に入り');
  btn.textContent = isFav ? '♥' : '♡';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (favorites.has(key)) {
      favorites.delete(key);
      btn.textContent = '♡';
      btn.classList.remove('fav-active');
    } else {
      favorites.add(key);
      btn.textContent = '♥';
      btn.classList.add('fav-active');
    }
    saveFavorites();
    if (document.querySelector('.filter-btn.active')?.dataset.filter === 'fav') {
      applyFilters();
    }
  });
  td.appendChild(btn);
  return td;
}

// お気に入りボタン列を各テーブルに追加
document.querySelectorAll('.loc-table').forEach(table => {
  const headerTr = table.querySelector('thead tr');
  if (headerTr) {
    const th = document.createElement('th');
    th.textContent = '♡';
    th.style.cssText = 'width:44px;text-align:center';
    headerTr.appendChild(th);
  }
  table.querySelectorAll('tbody tr').forEach(row => {
    row.appendChild(makeFavTd(getRowKey(row)));
  });
});

// --- 住所コピーボタン ---
function makeCopyBtn(addrText) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = 'コピー';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addrText).then(() => {
      btn.textContent = '✓';
      btn.classList.add('copy-done');
      setTimeout(() => {
        btn.textContent = 'コピー';
        btn.classList.remove('copy-done');
      }, 1500);
    });
  });
  return btn;
}

document.querySelectorAll('td.addr').forEach(addrTd => {
  addrTd.appendChild(makeCopyBtn(addrTd.dataset.addrText || addrTd.textContent.trim()));
});

// --- モバイル詳細折りたたみ ---
document.querySelectorAll('.loc-table tbody tr').forEach(row => {
  Array.from(row.cells).forEach((cell, i) => {
    if (!cell.classList.contains('song') && !cell.classList.contains('fav-cell') && i !== 1) {
      cell.classList.add('detail-content');
    }
  });

  const toggleTd = document.createElement('td');
  toggleTd.className = 'detail-toggle-cell';
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'detail-toggle-btn';
  toggleBtn.textContent = '詳細を見る ▼';
  toggleBtn.addEventListener('click', () => {
    const expanded = row.classList.toggle('expanded');
    toggleBtn.textContent = expanded ? '閉じる ▲' : '詳細を見る ▼';
  });
  toggleTd.appendChild(toggleBtn);
  row.insertBefore(toggleTd, row.querySelector('.song').nextSibling);
});

// --- song-viewコンテナを作成 ---
const songViewContainer = document.createElement('div');
songViewContainer.id = 'song-view';
songViewContainer.style.display = 'none';
document.querySelector('.group-section').parentNode.insertBefore(
  songViewContainer,
  document.querySelector('.group-section')
);

// --- フィルター・検索 ---
const filterButtons = document.querySelectorAll('.filter-btn');
const groupSections = document.querySelectorAll('.group-section');
const search = document.getElementById('search');

function applyFilters() {
  const activeCat = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const searchQuery = search.value.trim().toLowerCase();
  const isSongView = songViewContainer.style.display !== 'none';

  const targets = isSongView
    ? Array.from(songViewContainer.querySelectorAll('.song-group-section'))
    : Array.from(groupSections);

  targets.forEach(section => {
    const rows = section.querySelectorAll('tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
      let matchCat;
      if (activeCat === 'all') {
        matchCat = true;
      } else if (activeCat === 'fav') {
        matchCat = favorites.has(getRowKey(row));
      } else {
        matchCat = row.dataset.cat === activeCat;
      }

      const songText = isSongView
        ? (row.dataset.songName || '')
        : (row.querySelector('.song')?.textContent || '').toLowerCase();
      const locText = (row.dataset.locText || '').toLowerCase();
      const addrText = (row.dataset.addrText || '').toLowerCase();

      const matchSearch = searchQuery === '' ||
                          songText.includes(searchQuery) ||
                          locText.includes(searchQuery) ||
                          addrText.includes(searchQuery);

      row.style.display = (matchCat && matchSearch) ? '' : 'none';
      if (matchCat && matchSearch) visibleCount++;
    });

    section.style.display = visibleCount > 0 ? '' : 'none';
  });
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    applyFilters();
  });
});

search.addEventListener('input', applyFilters);

// --- 曲名グループ表示 ---
function buildSongView() {
  const songMap = new Map();

  document.querySelectorAll('.loc-table tbody tr').forEach(row => {
    const song = row.querySelector('.song')?.textContent.trim();
    if (!song) return;

    const item = {
      key: row.dataset.rowKey,
      song,
      loc: row.dataset.locText || '',
      addr: row.dataset.addrText || '',
      badgeHTML: row.querySelector('.badge')?.outerHTML || '',
      access: '',
      hours: '',
      cat: row.dataset.cat,
    };

    row.querySelectorAll('td').forEach(td => {
      const label = td.getAttribute('data-label');
      if (label === '見学・入場可否') item.access = td.textContent.trim();
      if (label === '営業時間') item.hours = td.textContent.trim();
    });

    if (!songMap.has(song)) songMap.set(song, []);
    songMap.get(song).push(item);
  });

  songViewContainer.innerHTML = '';

  songMap.forEach((items, song) => {
    const section = document.createElement('div');
    section.className = 'song-group-section';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'group-title';
    const h2 = document.createElement('h2');
    h2.className = 'song-h2';
    h2.textContent = song;
    titleDiv.appendChild(h2);
    section.appendChild(titleDiv);

    const table = document.createElement('table');
    table.className = 'loc-table';
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    ['ロケ地', '住所', '判定', '見学・入場可否', '営業時間', '♡'].forEach((text, i) => {
      const th = document.createElement('th');
      th.textContent = text;
      if (i === 5) th.style.cssText = 'width:44px;text-align:center';
      headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);
    const tbody = document.createElement('tbody');

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.dataset.cat = item.cat;
      tr.dataset.rowKey = item.key;
      tr.dataset.locText = item.loc;
      tr.dataset.addrText = item.addr;
      tr.dataset.songName = item.song.toLowerCase();

      const cellDefs = [
        { label: 'ロケ地', text: item.loc },
        { label: '住所', text: item.addr, cls: 'addr', copy: true },
        { label: '判定', html: item.badgeHTML },
        { label: '見学・入場可否', text: item.access },
        { label: '営業時間', text: item.hours, cls: 'note' },
      ];

      cellDefs.forEach(({ label, text, html, cls, copy }) => {
        const td = document.createElement('td');
        td.setAttribute('data-label', label);
        if (cls) td.className = cls;
        if (html) td.innerHTML = html;
        else td.textContent = text || '';
        if (copy) td.appendChild(makeCopyBtn(item.addr));
        tr.appendChild(td);
      });

      tr.appendChild(makeFavTd(item.key));
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    section.appendChild(table);
    songViewContainer.appendChild(section);
  });
}

// 曲でまとめるトグルボタン
const songViewToggleBtn = document.createElement('button');
songViewToggleBtn.className = 'filter-btn song-view-toggle';
songViewToggleBtn.textContent = '曲でまとめる';
document.querySelector('.filter-group').appendChild(songViewToggleBtn);

const jumpnav = document.querySelector('.jumpnav');

songViewToggleBtn.addEventListener('click', () => {
  const isActive = songViewToggleBtn.classList.toggle('active');

  if (isActive) {
    buildSongView();
    songViewContainer.style.display = '';
    groupSections.forEach(s => s.style.display = 'none');
    jumpnav.style.display = 'none';
  } else {
    songViewContainer.style.display = 'none';
    jumpnav.style.display = '';
    groupSections.forEach(s => s.style.display = '');
  }

  applyFilters();
});
