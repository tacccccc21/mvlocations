// --- 行キーを事前計算して保存（DOM構造変更前に実施） ---
document.querySelectorAll('.loc-table tbody tr').forEach(row => {
  const song = row.querySelector('.song')?.textContent.trim() || '';
  const loc = row.cells[1]?.textContent.trim() || '';
  row.dataset.rowKey = song + '__' + loc;
  row.dataset.locText = loc;
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

// お気に入りボタン列を各テーブルに追加（最終列として追加）
document.querySelectorAll('.loc-table').forEach(table => {
  const headerTr = table.querySelector('thead tr');
  if (headerTr) {
    const th = document.createElement('th');
    th.textContent = '♡';
    th.style.cssText = 'width:44px;text-align:center';
    headerTr.appendChild(th);
  }

  table.querySelectorAll('tbody tr').forEach(row => {
    const isFav = favorites.has(getRowKey(row));
    const td = document.createElement('td');
    td.className = 'fav-cell';
    td.setAttribute('data-label', '');
    const btn = document.createElement('button');
    btn.className = 'fav-btn' + (isFav ? ' fav-active' : '');
    btn.setAttribute('aria-label', 'お気に入り');
    btn.textContent = isFav ? '♥' : '♡';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = getRowKey(row);
      if (favorites.has(k)) {
        favorites.delete(k);
        btn.textContent = '♡';
        btn.classList.remove('fav-active');
      } else {
        favorites.add(k);
        btn.textContent = '♥';
        btn.classList.add('fav-active');
      }
      saveFavorites();
      if (document.querySelector('.filter-btn.active')?.dataset.filter === 'fav') {
        applyFilters();
      }
    });
    td.appendChild(btn);
    row.appendChild(td);
  });
});

// --- モバイル詳細折りたたみ ---
// song と fav-cell 以外を detail-content としてマーク → トグルボタンを song の直後に挿入
document.querySelectorAll('.loc-table tbody tr').forEach(row => {
  Array.from(row.cells).forEach((cell, i) => {
    // song(0)・ロケ地(1)・fav-cell は常時表示、それ以外を折りたたむ
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

  const songCell = row.querySelector('.song');
  row.insertBefore(toggleTd, songCell.nextSibling);
});

// --- フィルター・検索 ---
const buttons = document.querySelectorAll('.filter-btn');
const sections = document.querySelectorAll('.group-section');
const search = document.getElementById('search');

function applyFilters() {
  const activeCat = document.querySelector('.filter-btn.active').dataset.filter;
  const searchQuery = search.value.trim().toLowerCase();

  sections.forEach(section => {
    const rows = section.querySelectorAll('tbody tr');
    let visibleRowsCount = 0;

    rows.forEach(row => {
      let matchCat;
      if (activeCat === 'all') {
        matchCat = true;
      } else if (activeCat === 'fav') {
        matchCat = favorites.has(getRowKey(row));
      } else {
        matchCat = row.dataset.cat === activeCat;
      }

      const songText = row.querySelector('.song')?.textContent.toLowerCase() || '';
      const locText = (row.dataset.locText || '').toLowerCase();
      const addrText = row.querySelector('.addr')?.textContent.toLowerCase() || '';

      const matchSearch = searchQuery === '' ||
                          songText.includes(searchQuery) ||
                          locText.includes(searchQuery) ||
                          addrText.includes(searchQuery);

      if (matchCat && matchSearch) {
        row.style.display = '';
        visibleRowsCount++;
      } else {
        row.style.display = 'none';
      }
    });

    section.style.display = visibleRowsCount > 0 ? '' : 'none';
  });
}

buttons.forEach(button => {
  button.addEventListener('click', () => {
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    applyFilters();
  });
});

search.addEventListener('input', applyFilters);
