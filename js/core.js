/* DượcLâmSàng BVĐKVũThư – khung điều hướng (sidebar trái + khung xem tài liệu).
   Không thu thập dữ liệu bệnh nhân. localStorage chỉ lưu tùy chọn giao diện
   (nhóm thu gọn, danh sách id tài liệu yêu thích / đã xem). */
(function () {
  'use strict';

  var APP_NAME = 'DượcLâmSàng BVĐKVũThư';
  var DATA_URL = 'data/pages.json';
  var MOBILE_MAX = 900;
  var RECENT_MAX = 6;

  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), sidebar = $('sidebar'), scrim = $('scrim');
  var navGroups = $('navGroups'), search = $('search');
  var homeView = $('homeView'), docView = $('docView');
  var frame = $('docFrame'), docLoading = $('docLoading');
  var crumb = $('crumb'), tbActions = $('tbActions');
  var btnFav = $('btnFav'), btnReload = $('btnReload'), btnNewTab = $('btnNewTab');
  var sbToggle = $('sbToggle');

  var state = { data: null, byId: {}, catById: {}, current: null, tagFilter: null, catFilter: null };

  /* ---------- Lưu trữ an toàn (có thể bị chặn ở chế độ riêng tư) ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('cph.' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('cph.' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  };

  /* ---------- Tiện ích ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Chuẩn hóa không dấu tiếng Việt cho tìm kiếm
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function tokens(q) { return norm(q).split(/\s+/).filter(Boolean); }

  // Tô sáng các từ khóa trên chuỗi gốc (có dấu), so khớp theo chuỗi đã chuẩn hóa
  function highlight(text, toks) {
    text = String(text);
    if (!toks.length) return esc(text);
    var flat = '', map = [];
    for (var i = 0; i < text.length; i++) {
      var n = norm(text[i]);
      for (var j = 0; j < n.length; j++) { flat += n[j]; map.push(i); }
    }
    var marks = new Array(text.length);
    toks.forEach(function (t) {
      var from = 0, at;
      while ((at = flat.indexOf(t, from)) !== -1) {
        for (var k = at; k < at + t.length; k++) marks[map[k]] = true;
        from = at + t.length;
      }
    });
    var out = '', open = false;
    for (var c = 0; c < text.length; c++) {
      if (marks[c] && !open) { out += '<mark>'; open = true; }
      if (!marks[c] && open) { out += '</mark>'; open = false; }
      out += esc(text[c]);
    }
    return open ? out + '</mark>' : out;
  }

  function isMobile() { return window.matchMedia('(max-width:' + MOBILE_MAX + 'px)').matches; }
  function docHref(rec) { return encodeURI(rec.file); }
  function haystack(rec) {
    var cat = state.catById[rec.category];
    return norm([rec.title, (rec.tags || []).join(' '), cat ? cat.name : ''].join(' '));
  }
  function matches(rec, toks) {
    if (!toks.length) return true;
    var h = rec._hay;
    return toks.every(function (t) { return h.indexOf(t) !== -1; });
  }

  /* ---------- Sidebar ---------- */
  var CAT_ICONS = {
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
    compare: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    code: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M8 17h3"/>',
    law: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>'
  };
  function catIcon(cat) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (CAT_ICONS[cat.icon] || CAT_ICONS.book) + '</svg>';
  }

  function renderNav() {
    var d = state.data;
    var toks = tokens(search.value);
    var closed = store.get('closed', {});
    var favs = store.get('favs', []);
    var html = '', total = 0;

    d.categories.forEach(function (cat) {
      var items = d.records.filter(function (r) { return r.category === cat.id && matches(r, toks); });
      if (!items.length) return;
      total += items.length;
      var isClosed = !toks.length && closed[cat.id];
      html += '<div class="nav-group' + (isClosed ? ' closed' : '') + '" data-cat="' + esc(cat.id) + '">' +
        '<button class="nav-group-btn" type="button" aria-expanded="' + (!isClosed) + '">' +
        catIcon(cat) + '<span>' + esc(cat.name) + '</span>' +
        '<span class="nav-count">' + items.length + '</span>' +
        '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<ul class="nav-list">' + items.map(function (r) {
          var active = state.current && state.current.id === r.id;
          return '<li><a class="nav-item' + (active ? ' active' : '') + '" href="#/p/' + encodeURIComponent(r.id) + '"' +
            (active ? ' aria-current="page"' : '') + ' data-id="' + esc(r.id) + '">' +
            '<span class="dot" aria-hidden="true"></span><span>' + highlight(r.title, toks) + '</span>' +
            (favs.indexOf(r.id) !== -1 ? '<span class="fav-mark" aria-label="Yêu thích">★</span>' : '') +
            '</a></li>';
        }).join('') + '</ul></div>';
    });

    navGroups.innerHTML = total ? html : '<p class="nav-empty">Không tìm thấy tài liệu phù hợp.</p>';
    document.querySelector('.nav-home').classList.toggle('active', !state.current);
  }

  navGroups.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-group-btn');
    if (!btn) return;
    var g = btn.parentNode, id = g.getAttribute('data-cat');
    var nowClosed = !g.classList.contains('closed');
    g.classList.toggle('closed', nowClosed);
    btn.setAttribute('aria-expanded', String(!nowClosed));
    if (!search.value.trim()) {
      var closed = store.get('closed', {});
      closed[id] = nowClosed;
      store.set('closed', closed);
    }
  });

  search.addEventListener('input', function () { renderNav(); });
  search.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var first = navGroups.querySelector('.nav-item');
      if (first) { e.preventDefault(); location.hash = first.getAttribute('href'); }
    } else if (e.key === 'ArrowDown') {
      var f = navGroups.querySelector('.nav-item');
      if (f) { e.preventDefault(); f.focus(); }
    } else if (e.key === 'Escape') {
      search.value = ''; renderNav();
    }
  });
  // Mũi tên lên/xuống giữa các mục trong sidebar
  $('nav').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.nav-home, .nav-group:not(.closed) .nav-item'));
    var i = items.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && i === 0) { search.focus(); return; }
    var next = items[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) next.focus();
  });

  /* ---------- Mở / thu gọn sidebar ---------- */
  function setDrawer(open) {
    app.classList.toggle('sb-open', open);
    scrim.hidden = !open;
    sbToggle.setAttribute('aria-expanded', String(open));
    if (open) search.focus();
  }
  function syncToggleState() {
    sbToggle.setAttribute('aria-expanded', String(isMobile() ? app.classList.contains('sb-open') : !app.classList.contains('sb-collapsed')));
  }
  sbToggle.addEventListener('click', function () {
    if (isMobile()) { setDrawer(!app.classList.contains('sb-open')); return; }
    var collapsed = !app.classList.contains('sb-collapsed');
    app.classList.toggle('sb-collapsed', collapsed);
    store.set('collapsed', collapsed);
    syncToggleState();
  });
  $('sbClose').addEventListener('click', function () { setDrawer(false); sbToggle.focus(); });
  scrim.addEventListener('click', function () { setDrawer(false); });
  window.matchMedia('(max-width:' + MOBILE_MAX + 'px)').addEventListener('change', function () {
    setDrawer(false); syncToggleState();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && app.classList.contains('sb-open')) { setDrawer(false); sbToggle.focus(); }
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !e.target.isContentEditable) {
      e.preventDefault();
      if (isMobile()) setDrawer(true);
      else { app.classList.remove('sb-collapsed'); syncToggleState(); }
      search.focus(); search.select();
    }
  });

  /* ---------- Trang chủ ---------- */
  function cardHtml(r) {
    var cat = state.catById[r.category];
    return '<a class="card" href="#/p/' + encodeURIComponent(r.id) + '">' +
      '<span class="card-cat">' + esc(cat ? cat.name : '') + '</span>' +
      '<span class="card-title">' + esc(r.title) + '</span>' +
      '<span class="card-tags">' + (r.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
      (r.review ? '<span class="tag review">' + esc(r.review) + '</span>' : '') + '</span></a>';
  }
  function idsToRecs(ids) { return ids.map(function (id) { return state.byId[id]; }).filter(Boolean); }

  var HERO_IMG = 'images/cong-bv.jpg';
  // Lối tắt trên khung giới thiệu: chỉ hiện khi tài liệu tương ứng có trong danh mục
  var QUICK = [
    { id: 'icd10-tra-cuu', label: 'Tra cứu ICD-10' },
    { id: 'tt20-tra-cuu', label: 'Tra cứu TT20 – BHYT' }
  ];

  function renderHome() {
    var d = state.data;
    var favs = idsToRecs(store.get('favs', []));
    var recent = idsToRecs(store.get('recent', []));
    var allTags = [];
    d.records.forEach(function (r) { (r.tags || []).forEach(function (t) { if (allTags.indexOf(t) === -1) allTags.push(t); }); });
    allTags.sort(function (a, b) { return a.localeCompare(b, 'vi'); });

    var list = d.records.filter(function (r) {
      return (!state.catFilter || r.category === state.catFilter) &&
        (!state.tagFilter || (r.tags || []).indexOf(state.tagFilter) !== -1);
    });
    var catName = state.catFilter && state.catById[state.catFilter] ? state.catById[state.catFilter].name : null;

    var img = '<img src="' + HERO_IMG + '" width="1344" height="768" alt="Phối cảnh cổng Bệnh viện Đa khoa Vũ Thư">';
    var html =
      '<div class="hero"><div class="hero-text"><h1 id="homeTitle">Cổng tra cứu dược lâm sàng</h1>' +
      '<p>' + d.records.length + ' tài liệu và công cụ: tóm tắt guideline, thông tin thuốc, so sánh dược lý, thẩm định bài báo, tra cứu ICD-10 và Thông tư 20. Chọn tài liệu ở thanh bên trái hoặc bên dưới.</p>' +
      '<div class="hero-links">' + QUICK.filter(function (q) { return state.byId[q.id]; }).map(function (q) {
        return '<a href="#/p/' + encodeURIComponent(q.id) + '">' + esc(q.label) + '</a>';
      }).join('') + '</div></div>' +
      '<div class="hero-img">' + img + '</div></div>' +
      '<div class="stats">' + d.categories.map(function (c) {
        var n = d.records.filter(function (r) { return r.category === c.id; }).length;
        return '<a class="stat" href="#/c/' + encodeURIComponent(c.id) + '"><b>' + n + '</b><span>' + esc(c.name) + '</span></a>';
      }).join('') + '</div>' +
      '<div class="notice" role="note">Nội dung chỉ dùng tham khảo chuyên môn, không thay thế phán đoán lâm sàng; các tài liệu gắn nhãn “chưa kiểm chứng” cần dược sĩ hoặc bác sĩ khác đối chiếu nguồn trước khi áp dụng. ' +
      'Ứng dụng không thu thập dữ liệu bệnh nhân. Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP; đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</div>';

    if (favs.length) html += '<h2 class="sec-title">★ Yêu thích</h2><div class="cards">' + favs.map(cardHtml).join('') + '</div>';
    if (recent.length) html += '<h2 class="sec-title">Xem gần đây</h2><div class="cards">' + recent.map(cardHtml).join('') + '</div>';

    html += '<h2 class="sec-title">' + (catName ? esc(catName) : 'Tất cả tài liệu') + ' <span class="nav-count">' + list.length + '</span>' +
      (catName ? ' <a href="#/" style="font-size:13px;font-weight:500">Bỏ lọc</a>' : '') + '</h2>' +
      '<div class="chips" role="group" aria-label="Lọc theo chuyên khoa">' +
      '<button type="button" class="chip" data-tag="" aria-pressed="' + (!state.tagFilter) + '">Tất cả</button>' +
      allTags.map(function (t) {
        return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' + (state.tagFilter === t) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="cards">' + list.map(cardHtml).join('') + '</div>' : '<p class="empty">Không có tài liệu phù hợp bộ lọc.</p>') +
      '<p class="foot-note">Danh mục phiên bản ' + esc(d.version) + ', cập nhật ' + esc(d.updated) + '. ' + esc(d.source) + '</p>';

    homeView.innerHTML = html;
  }

  homeView.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    state.tagFilter = chip.getAttribute('data-tag') || null;
    renderHome();
  });

  /* ---------- Xem tài liệu ---------- */
  function setCrumb(rec) {
    if (!rec) {
      var c = state.catFilter && state.catById[state.catFilter];
      crumb.innerHTML = '<span class="crumb-title">' + (c ? esc(c.name) : 'Trang chủ') + '</span>';
      return;
    }
    var cat = state.catById[rec.category];
    crumb.innerHTML = '<span class="crumb-cat">' + esc(cat ? cat.name : '') + ' ›</span><span class="crumb-title" title="' + esc(rec.title) + '">' + esc(rec.title) + '</span>';
  }

  function updateFavBtn() {
    var on = !!state.current && store.get('favs', []).indexOf(state.current.id) !== -1;
    btnFav.setAttribute('aria-pressed', String(on));
    btnFav.setAttribute('aria-label', on ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích');
  }

  function openDoc(rec) {
    state.current = rec;
    var href = docHref(rec);
    homeView.hidden = true;
    docView.hidden = false;
    tbActions.hidden = false;
    if (frame.getAttribute('src') !== href) {
      docLoading.hidden = false;
      frame.setAttribute('src', href);
    }
    btnNewTab.setAttribute('href', href);
    setCrumb(rec);
    updateFavBtn();
    document.title = rec.title + ' · ' + APP_NAME;

    var recent = store.get('recent', []).filter(function (id) { return id !== rec.id; });
    recent.unshift(rec.id);
    store.set('recent', recent.slice(0, RECENT_MAX));

    renderNav();
    var active = navGroups.querySelector('.nav-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
    if (isMobile()) setDrawer(false);
  }

  function showHome() {
    state.current = null;
    docView.hidden = true;
    tbActions.hidden = true;
    homeView.hidden = false;
    setCrumb(null);
    document.title = APP_NAME;
    renderHome();
    renderNav();
    $('main').scrollTop = 0;
    if (isMobile()) setDrawer(false);
  }

  frame.addEventListener('load', function () { docLoading.hidden = true; });

  btnFav.addEventListener('click', function () {
    if (!state.current) return;
    var favs = store.get('favs', []), id = state.current.id, i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    store.set('favs', favs);
    updateFavBtn();
    renderNav();
  });
  btnReload.addEventListener('click', function () {
    docLoading.hidden = false;
    try { frame.contentWindow.location.reload(); }
    catch (e) { var s = frame.getAttribute('src'); frame.setAttribute('src', 'about:blank'); frame.setAttribute('src', s); }
  });

  /* ---------- Định tuyến theo hash: #/  #/c/<nhóm>  #/p/<id> ---------- */
  function route() {
    if (!state.data) return;
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    if (parts[0] === 'p' && parts[1]) {
      var rec = state.byId[decodeURIComponent(parts[1])];
      if (rec) { openDoc(rec); return; }
      history.replaceState(null, '', '#/');
      parts = [''];
    }
    state.catFilter = (parts[0] === 'c' && state.catById[decodeURIComponent(parts[1] || '')]) ? decodeURIComponent(parts[1]) : null;
    showHome();
  }
  window.addEventListener('hashchange', route);

  /* ---------- Trạng thái mạng ---------- */
  function updateNet() {
    var el = $('netStatus');
    el.textContent = navigator.onLine ? 'Đang trực tuyến' : 'Ngoại tuyến – dùng bản đã lưu';
    el.classList.toggle('offline', !navigator.onLine);
  }
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);

  /* ---------- Khởi động ---------- */
  function validateData(d) {
    if (!d || !Array.isArray(d.categories) || !Array.isArray(d.records)) throw new Error('Sai cấu trúc pages.json');
    var seen = {};
    d.records.forEach(function (r) {
      if (!r.id || !r.title || !r.file || !r.category) throw new Error('Bản ghi thiếu trường bắt buộc: ' + JSON.stringify(r));
      if (seen[r.id]) throw new Error('Trùng id: ' + r.id);
      seen[r.id] = true;
    });
    return d;
  }

  function loadFailed(err) {
    var fileProto = location.protocol === 'file:';
    var msg = fileProto
      ? 'Trình duyệt chặn đọc dữ liệu khi mở trực tiếp tệp index.html. Hãy mở qua máy chủ web (GitHub Pages, hoặc chạy tools/serve.ps1).'
      : 'Không tải được danh mục tài liệu (' + esc(err && err.message) + ').';
    navGroups.innerHTML = '<p class="nav-empty">' + msg + '</p>';
    homeView.innerHTML = '<div class="notice" role="alert">' + msg + '</div>';
  }

  if (store.get('collapsed', false)) app.classList.add('sb-collapsed');
  syncToggleState();
  updateNet();

  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      state.data = validateData(d);
      d.categories.forEach(function (c) { state.catById[c.id] = c; });
      d.records.forEach(function (r) { state.byId[r.id] = r; r._hay = haystack(r); });
      $('dataVer').textContent = 'Danh mục v' + d.version + ' · ' + d.updated;
      route();
    })
    .catch(loadFailed);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* không chặn ứng dụng */ });
    });
  }
})();
