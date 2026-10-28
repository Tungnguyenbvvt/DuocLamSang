/* Module tra cứu dùng chung (ICD-10, TT20…): đọc một tệp data/*.json, tìm kiếm không dấu,
   lọc theo trường, hiển thị bảng (desktop) / thẻ (điện thoại). Chỉ sửa DOM bên trong #lookup.
   Xuất: window.Lookup.init(config) và window.Lookup._test (hàm thuần cho ca kiểm thử). */
(function () {
  'use strict';

  var PAGE = 100;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function tokens(q) { return norm(q).split(/\s+/).filter(Boolean); }

  function highlight(text, toks) {
    text = String(text == null ? '' : text);
    // Từ khóa 1 ký tự (vd "2" trong "típ 2") khớp quá nhiều chỗ: chỉ tô khi đó là từ khóa duy nhất
    if (toks.length > 1) toks = toks.filter(function (t) { return t.length > 1; });
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

  // Mã so sánh không phân biệt dấu chấm và ký hiệu †/* (A00.0 = a000 = A00.0†)
  function codeKey(s) { return norm(s).replace(/[\s.†*]/g, ''); }

  // Lọc + xếp hạng: khớp đúng mã > mã bắt đầu bằng từ khóa > khớp trong trường chính (tên)
  // > chỉ khớp ở trường phụ (ghi chú, hướng dẫn); cùng bậc giữ thứ tự gốc
  function search(records, query, cfg, filterVals) {
    var toks = tokens(query);
    var q = codeKey(query);
    var out = [];
    records.forEach(function (r, idx) {
      for (var f in filterVals) {
        var want = filterVals[f];
        if (!want) continue;
        var v = r[f];
        if (Array.isArray(v) ? v.indexOf(want) === -1 : v !== want) return;
      }
      var t;
      if (toks.length) {
        var hay = r._hay;
        for (t = 0; t < toks.length; t++) if (hay.indexOf(toks[t]) === -1) return;
      }
      var rank = 2;
      var code = r._code;
      if (q && code) rank = code === q ? 0 : code.indexOf(q) === 0 ? 1 : 2;
      if (rank === 2 && toks.length && r._main !== undefined) {
        for (t = 0; t < toks.length; t++) if (r._main.indexOf(toks[t]) === -1) { rank = 3; break; }
      }
      out.push({ r: r, rank: rank, idx: idx });
    });
    out.sort(function (a, b) { return a.rank - b.rank || a.idx - b.idx; });
    return out.map(function (x) { return x.r; });
  }

  function joinFields(r, fields) {
    return fields.map(function (f) { var v = r[f]; return Array.isArray(v) ? v.join(' ') : v; }).join(' ');
  }
  function prepare(records, cfg) {
    records.forEach(function (r) {
      r._code = cfg.codeField ? codeKey(r[cfg.codeField]) : '';
      r._hay = norm(joinFields(r, cfg.searchFields)) + (r._code ? ' ' + r._code : '');
      // Trường chính chỉ gồm tên: số trong từ khóa ("típ 2") không được khớp nhầm vào mã ("E10.2")
      if (cfg.primaryFields) r._main = norm(joinFields(r, cfg.primaryFields));
    });
    return records;
  }

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
    var state = { data: null, list: [], shown: PAGE, filters: {} };

    // col.render(r, data, hl, has) trả về HTML; hl(text) = tô sáng từ khóa + thoát HTML;
    // has(text) = text chứa từ khóa (để tự mở phần bị thu gọn)
    function cell(col, r, toks) {
      if (col.render) {
        return col.render(r, state.data, function (t) { return highlight(t, toks); }, function (t) {
          var n = norm(t); return toks.some(function (k) { return k.length > 1 && n.indexOf(k) !== -1; });
        });
      }
      return highlight(r[col.field], col.noHighlight ? [] : toks);
    }

    function render() {
      var toks = tokens(input.value);
      state.list = search(state.data.records, input.value, cfg, state.filters);
      var rows = state.list.slice(0, state.shown);
      countEl.textContent = state.list.length
        ? 'Tìm thấy ' + state.list.length + ' kết quả' + (state.list.length > rows.length ? ', đang hiển thị ' + rows.length : '')
        : '';
      body.innerHTML = rows.length ? rows.map(function (r) {
        return '<tr>' + cfg.columns.map(function (col) {
          return '<td data-label="' + esc(col.label) + '"' + (col.cls ? ' class="' + col.cls + '"' : '') + '>' + cell(col, r, toks) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr class="lk-empty"><td colspan="' + cfg.columns.length + '">Không tìm thấy kết quả phù hợp.</td></tr>';
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
      timer = setTimeout(function () { state.shown = PAGE; render(); }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; state.shown = PAGE; render(); }
    });
    moreBtn.addEventListener('click', function () { state.shown += PAGE; render(); });

    fetch(cfg.dataUrl, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        state.data = validate(d);
        prepare(d.records, cfg);
        root.querySelector('.lk-sample').hidden = !d.sample;
        root.querySelector('.lk-meta').innerHTML =
          'Dữ liệu phiên bản ' + esc(d.version) + ', cập nhật ' + esc(d.updated) + ' · ' + d.records.length + ' dòng.<br>' +
          '<b>Nguồn:</b> ' + esc(d.source) + (d.extraction ? '<br><b>Cách trích:</b> ' + esc(d.extraction) : '');
        if (cfg.onData) cfg.onData(d);
        buildFilters();
        render();
        input.disabled = false;
      })
      .catch(function (err) {
        body.innerHTML = '<tr class="lk-empty"><td colspan="' + cfg.columns.length + '">Không tải được dữ liệu (' + esc(err.message) + ').</td></tr>';
      });
  }

  window.Lookup = { init: init, _test: { norm: norm, tokens: tokens, codeKey: codeKey, search: search, prepare: prepare, highlight: highlight, validate: validate } };
})();
