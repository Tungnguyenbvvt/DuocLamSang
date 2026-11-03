/* Module tra cứu dùng chung (ICD-10, TT20…): đọc một tệp data/*.json, tìm qua js/search.js,
   lọc theo trường, hiển thị bảng (desktop) / thẻ (điện thoại). Chỉ sửa DOM bên trong #lookup.
   Nhận tham số trên URL: ?q=<từ khóa>&f=<khóa dòng> (cfg.rowKey) để mở đúng dòng từ sidebar.
   Xuất: window.Lookup.init(config) và window.Lookup._test (hàm thuần cho ca kiểm thử). */
(function () {
  'use strict';

  var PAGE = 100;

  var S = window.DlsSearch;
  var esc = S.esc, highlight = S.highlight;

  function search(records, query, cfg, filterVals) { return S.run(records, query, filterVals).list; }

  function validate(d) {
    if (!d || !Array.isArray(d.records)) throw new Error('Sai cấu trúc tệp dữ liệu (thiếu records)');
    ['version', 'updated', 'source'].forEach(function (k) {
      if (!d[k]) throw new Error('Tệp dữ liệu thiếu trường ' + k);
    });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.updated)) throw new Error('Trường updated phải dạng yyyy-mm-dd');
    return d;
  }

  function init(cfg) {
    var root = document.getElementById('lookup');
    var input = root.querySelector('.lk-search');
    var countEl = root.querySelector('.lk-count');
    var body = root.querySelector('.lk-body');
    var moreBtn = root.querySelector('.lk-more');
    var filtersEl = root.querySelector('.lk-filters');
    var params = new URLSearchParams(location.search);
    var state = { data: null, list: [], shown: PAGE, filters: {}, dict: null, focus: params.get('f') };

    var synEl = document.createElement('p');
    synEl.className = 'lk-syn';
    synEl.hidden = true;
    countEl.parentNode.insertBefore(synEl, countEl);

    // col.render(r, data, hl, has) trả về HTML; hl(text) = tô sáng từ khóa + thoát HTML;
    // has(text) = text chứa từ khóa (để tự mở phần bị thu gọn)
    function cell(col, r, toks) {
      if (col.render) {
        return col.render(r, state.data, function (t) { return highlight(t, toks); }, function (t) {
          var n = S.norm(t); return toks.some(function (k) { return k.length > 1 && n.indexOf(k) !== -1; });
        });
      }
      return highlight(r[col.field], col.noHighlight ? [] : toks);
    }

    function render() {
      var res = S.run(state.data.records, input.value, state.filters, state.dict);
      var toks = res.toks;
      state.list = res.list;
      if (state.focus) {
        // Dòng được chọn từ sidebar lên đầu danh sách
        var isFocus = function (r) { return cfg.rowKey(r) === state.focus; };
        state.list = state.list.filter(isFocus).concat(state.list.filter(function (r) { return !isFocus(r); }));
      }
      var rows = state.list.slice(0, state.shown);
      var note = S.noteHtml(res);
      synEl.innerHTML = note;
      synEl.hidden = !note;
      countEl.textContent = state.list.length
        ? 'Tìm thấy ' + state.list.length + ' kết quả' + (state.list.length > rows.length ? ', đang hiển thị ' + rows.length : '')
        : 'Không có kết quả';
      body.innerHTML = rows.length ? rows.map(function (r) {
        var focus = state.focus && cfg.rowKey(r) === state.focus;
        return '<tr' + (focus ? ' class="lk-focus"' : '') + '>' + cfg.columns.map(function (col) {
          return '<td data-label="' + esc(col.label) + '"' + (col.cls ? ' class="' + col.cls + '"' : '') + '>' + cell(col, r, toks) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr class="lk-empty"><td colspan="' + cfg.columns.length + '">Không tìm thấy kết quả phù hợp. ' + esc(cfg.emptyHint || '') + '</td></tr>';
      moreBtn.hidden = state.list.length <= rows.length;
    }

    function buildFilters() {
      (cfg.filters || []).forEach(function (f) {
        var opts = f.options ? f.options(state.data) : uniq(state.data.records, f.field);
        var id = 'lk-f-' + f.field;
        var wrap = document.createElement('label');
        wrap.className = 'lk-filter';
        wrap.setAttribute('for', id);
        wrap.innerHTML = '<span>' + esc(f.label) + '</span><select id="' + id + '"><option value="">Tất cả</option>' +
          opts.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('') + '</select>';
        wrap.querySelector('select').addEventListener('change', function (e) {
          state.filters[f.field] = e.target.value || null;
          state.shown = PAGE;
          render();
        });
        filtersEl.appendChild(wrap);
      });
    }
    function uniq(records, field) {
      var seen = [], out = [];
      records.forEach(function (r) {
        var v = r[field];
        if (v && seen.indexOf(v) === -1) { seen.push(v); out.push({ value: v, label: v }); }
      });
      return out;
    }

    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      state.focus = null;
      timer = setTimeout(function () { state.shown = PAGE; render(); }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; state.focus = null; state.shown = PAGE; render(); }
    });
    moreBtn.addEventListener('click', function () { state.shown += PAGE; render(); });

    // Từ điển đồng nghĩa là phần bổ sung: thiếu tệp thì tìm kiếm vẫn chạy bình thường
    var dictLoad = fetch('../data/synonyms.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    fetch(cfg.dataUrl, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { return dictLoad.then(function (syn) { state.dict = S.buildDict(syn); return d; }); })
      .then(function (d) {
        state.data = validate(d);
        S.prepare(d.records, cfg);
        root.querySelector('.lk-sample').hidden = !d.sample;
        root.querySelector('.lk-meta').innerHTML =
          'Dữ liệu phiên bản ' + esc(d.version) + ', cập nhật ' + esc(d.updated) + ' · ' + d.records.length + ' dòng.<br>' +
          '<b>Nguồn:</b> ' + esc(d.source) + (d.extraction ? '<br><b>Cách trích:</b> ' + esc(d.extraction) : '');
        if (cfg.onData) cfg.onData(d);
        buildFilters();
        input.value = params.get('q') || '';
        render();
        input.disabled = false;
        var hit = body.querySelector('.lk-focus');
        if (hit) hit.scrollIntoView({ block: 'center' });
      })
      .catch(function (err) {
        body.innerHTML = '<tr class="lk-empty"><td colspan="' + cfg.columns.length + '">Không tải được dữ liệu (' + esc(err.message) + ').</td></tr>';
      });
  }

  window.Lookup = { init: init, _test: { norm: S.norm, tokens: S.tokens, codeKey: S.codeKey, search: search, prepare: S.prepare, highlight: highlight, validate: validate, S: S } };
})();
