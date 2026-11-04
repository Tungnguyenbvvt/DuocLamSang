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
  var S = window.DlsSearch;
  var esc = S.esc, highlight = S.highlight;

  function isMobile() { return window.matchMedia('(max-width:' + MOBILE_MAX + 'px)').matches; }
  function docHref(rec) { return encodeURI(rec.file); }

  /* ---------- Tìm chung: tài liệu, mã ICD-10, thuốc TT20 ---------- */
  var ICD_CFG = { codeField: 'code', searchFields: ['code', 'name', 'nameEn', 'guide', 'guideEn'], primaryFields: ['name', 'nameEn'] };
  var TT20_CFG = { codeField: null, searchFields: ['name', 'route', 'form', 'note', 'group', 'subgroup'], primaryFields: ['name'] };
  var DOC_CFG = { codeField: null, searchFields: ['title', 'tags', '_catName'], primaryFields: ['title', 'tags'] };
  var HITS_MAX = 6;
  var EMPTY_HINT = 'Thử tên hoạt chất, ví dụ atorvastatin thay cho Lipitor, hoặc bớt từ khóa.';
  var index = { started: false, dict: null, icd: null, tt20: null, pending: 0 };

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  // Tải khi người dùng bắt đầu tìm, không tải lúc mở app (icd10.json nặng); mỗi nguồn lỗi độc lập
  function loadIndex() {
    if (index.started) return;
    index.started = true;
    function part(url, use) {
      index.pending++;
      fetchJson(url).then(use).catch(function () { /* nguồn này không tham gia tìm kiếm */ }).then(function () {
        index.pending--;
        if (search.value.trim()) renderNav();
      });
    }
    part('data/synonyms.json', function (d) { index.dict = S.buildDict(d); });
    part('data/doc-text.json', function (d) {
      state.data.records.forEach(function (r) { if (d.docs[r.id]) r._hay += ' ' + d.docs[r.id]; });
    });
    part('data/icd10.json', function (d) { index.icd = S.prepare(d.records, ICD_CFG); });
    part('data/tt20.json', function (d) { index.tt20 = S.prepare(d.records, TT20_CFG); });
  }

  /* ---------- Sidebar ---------- */
  var CAT_ICONS = {
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
    compare: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6"/>',
    code: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M8 17h3"/>',
    law: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
    service: '<path d="M4 20l7-7M13 11l5-5M15 4l5 5M9 9l6 6M4 20l-1 1"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
    protocol: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'
  };
  function catIcon(cat) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (CAT_ICONS[cat.icon] || CAT_ICONS.book) + '</svg>';
  }

  function groupHtml(catId, name, icon, count, body) {
    return '<div class="nav-group" data-cat="' + esc(catId) + '">' +
      '<button class="nav-group-btn" type="button" aria-expanded="true">' + icon + '<span>' + esc(name) + '</span>' +
      '<span class="nav-count">' + count + '</span>' +
      '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<ul class="nav-list">' + body + '</ul></div>';
  }
  function docItem(r, toks, favs) {
    var active = state.current && state.current.id === r.id;
    return '<li><a class="nav-item' + (active ? ' active' : '') + '" href="#/p/' + encodeURIComponent(r.id) + '"' +
      (active ? ' aria-current="page"' : '') + ' data-id="' + esc(r.id) + '">' +
      '<span class="dot" aria-hidden="true"></span><span>' + highlight(r.title, toks) + '</span>' +
      (favs.indexOf(r.id) !== -1 ? '<span class="fav-mark" aria-label="Yêu thích">★</span>' : '') +
      '</a></li>';
  }
  function toolHref(id, q, focus) {
    return '#/p/' + id + '?q=' + encodeURIComponent(q) + (focus ? '&f=' + encodeURIComponent(focus) : '');
  }
  function hitItem(href, code, text, sub, toks) {
    return '<li><a class="nav-item nav-hit" href="' + esc(href) + '">' + (code ? '<span class="hit-code">' + esc(code) + '</span>' : '') +
      '<span>' + highlight(text, toks) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></a></li>';
  }
  function moreItem(href, n) {
    return '<li><a class="nav-item nav-all" href="' + esc(href) + '">Xem tất cả ' + n.toLocaleString('vi-VN') + ' kết quả</a></li>';
  }

  // Một thuốc TT20 có nhiều dòng đường dùng: sidebar chỉ hiện mỗi thuốc một lần
  function uniqueDrugs(list) {
    var seen = {}, out = [];
    list.forEach(function (r) {
      var key = r.annex + '-' + r.stt;
      if (seen[key]) { seen[key].routes.push(r.route); return; }
      seen[key] = { r: r, key: key, routes: [r.route] };
      out.push(seen[key]);
    });
    return out;
  }

  function renderSearch(q, favs) {
    var d = state.data, html = '', total = 0, note = '';

    var docs = S.run(d.records, q, {}, index.dict);
    note = S.noteHtml(docs);
    total += docs.list.length;
    if (docs.list.length) {
      html += groupHtml('docs', 'Tài liệu', catIcon({ icon: 'book' }), docs.list.length, docs.list.slice(0, index.allDocs ? docs.list.length : HITS_MAX).map(function (r) {
        return docItem(r, docs.toks, favs);
      }).join('') + (!index.allDocs && docs.list.length > HITS_MAX ?
        '<li><button class="nav-item nav-all" type="button" data-all-docs>Xem tất cả ' + docs.list.length + ' tài liệu</button></li>' : ''));
    }
    if (index.icd) {
      var icd = S.run(index.icd, q, {}, index.dict);
      total += icd.list.length;
      if (icd.list.length) {
        html += groupHtml('icd10', 'Mã ICD-10', catIcon({ icon: 'code' }), icd.list.length.toLocaleString('vi-VN'), icd.list.slice(0, HITS_MAX).map(function (r) {
          return hitItem(toolHref('icd10-tra-cuu', r.code, r.code), r.code, r.name, '', icd.toks);
        }).join('') + (icd.list.length > HITS_MAX ? moreItem(toolHref('icd10-tra-cuu', q), icd.list.length) : ''));
      }
      note = note || S.noteHtml(icd);
    }
    if (index.tt20) {
      var tt = S.run(index.tt20, q, {}, index.dict);
      var drugs = uniqueDrugs(tt.list);
      total += drugs.length;
      if (drugs.length) {
        html += groupHtml('tt20', 'Thuốc TT20', catIcon({ icon: 'law' }), drugs.length.toLocaleString('vi-VN'), drugs.slice(0, HITS_MAX).map(function (x) {
          return hitItem(toolHref('tt20-tra-cuu', x.r.name, x.key), '', x.r.name, x.routes.filter(Boolean).join(' · '), tt.toks);
        }).join('') + (drugs.length > HITS_MAX ? moreItem(toolHref('tt20-tra-cuu', q), drugs.length) : ''));
      }
      note = note || S.noteHtml(tt);
    }

    var loading = index.pending > 0 ? '<p class="nav-empty">Đang tải dữ liệu tìm kiếm…</p>' : '';
    if (!total) return loading || '<p class="nav-empty">Không tìm thấy kết quả. ' + EMPTY_HINT + '</p>';
    return (note ? '<p class="nav-syn">' + note + '</p>' : '') + html + loading;
  }

  function renderNav() {
    var d = state.data;
    var q = search.value.trim();
    var closed = store.get('closed', {});
    var favs = store.get('favs', []);
    document.querySelector('.nav-home').classList.toggle('active', !state.current);
    if (q) { loadIndex(); navGroups.innerHTML = renderSearch(q, favs); return; }

    navGroups.innerHTML = d.categories.map(function (cat) {
      var items = d.records.filter(function (r) { return r.category === cat.id; });
      var isClosed = closed[cat.id];
      return '<div class="nav-group' + (isClosed ? ' closed' : '') + '" data-cat="' + esc(cat.id) + '">' +
        '<button class="nav-group-btn" type="button" aria-expanded="' + (!isClosed) + '">' +
        catIcon(cat) + '<span>' + esc(cat.name) + '</span>' +
        '<span class="nav-count">' + items.length + '</span>' +
        '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<ul class="nav-list">' + (items.length ? items.map(function (r) { return docItem(r, [], favs); }).join('') : '<li class="nav-empty">Chưa có dữ liệu.</li>') + '</ul></div>';
    }).join('');
  }

  navGroups.addEventListener('click', function (e) {
    if (e.target.closest('[data-all-docs]')) { index.allDocs = true; renderNav(); return; }
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

  search.addEventListener('input', function () { index.allDocs = false; renderNav(); });
  search.addEventListener('focus', function () { if (state.data) loadIndex(); });
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
    { id: 'tt20-tra-cuu', label: 'Tra cứu TT20 – BHYT' },
    { id: 'thuoc-tra-cuu', label: 'Tra cứu thông tin thuốc' }
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
      '<details class="notice"><summary>Chỉ dùng tham khảo, không thay thế phán đoán lâm sàng. <span class="notice-more">Xem thêm</span></summary>' +
      '<p>Nội dung chỉ dùng tham khảo chuyên môn, không thay thế phán đoán lâm sàng; các tài liệu gắn nhãn “chưa kiểm chứng” cần dược sĩ hoặc bác sĩ khác đối chiếu nguồn trước khi áp dụng. ' +
      'Ứng dụng không thu thập dữ liệu bệnh nhân. Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP; đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</p></details>';

    if (favs.length) html += '<h2 class="sec-title">★ Yêu thích</h2><div class="cards">' + favs.map(cardHtml).join('') + '</div>';
    if (recent.length) html += '<h2 class="sec-title">Xem gần đây</h2><div class="cards">' + recent.map(cardHtml).join('') + '</div>';

    html += '<h2 class="sec-title">' + (catName ? esc(catName) : 'Tất cả tài liệu') + ' <span class="nav-count">' + list.length + '</span>' +
      (catName ? ' <a href="#/" style="font-size:13px;font-weight:500">Bỏ lọc</a>' : '') + '</h2>' +
      '<div class="chips" role="group" aria-label="Lọc theo chuyên khoa">' +
      '<button type="button" class="chip" data-tag="" aria-pressed="' + (!state.tagFilter) + '">Tất cả</button>' +
      allTags.map(function (t) {
        return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' + (state.tagFilter === t) + '">' + esc(t) + '</button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="cards">' + list.map(cardHtml).join('') + '</div>' : '<p class="empty">' + (catName && !state.tagFilter ? 'Module này chưa có dữ liệu.' : 'Không có tài liệu phù hợp bộ lọc.') + '</p>') +
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

  function openDoc(rec, params) {
    state.current = rec;
    var href = docHref(rec) + (params ? '?' + params : '');
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

  /* ---------- Định tuyến theo hash: #/  #/c/<nhóm>  #/p/<id>[?q=<từ khóa>&f=<dòng>] ---------- */
  function route() {
    if (!state.data) return;
    var h = location.hash.replace(/^#\/?/, '').split('?');
    var parts = h[0].split('/');
    if (parts[0] === 'p' && parts[1]) {
      var rec = state.byId[decodeURIComponent(parts[1])];
      if (rec) { openDoc(rec, h[1]); return; }
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
      d.records.forEach(function (r) {
        state.byId[r.id] = r;
        r._catName = state.catById[r.category] ? state.catById[r.category].name : '';
      });
      S.prepare(d.records, DOC_CFG);
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
