/* Lõi tìm kiếm dùng chung cho sidebar (js/core.js) và module tra cứu (js/modules/lookup.js):
   chuẩn hóa không dấu, xếp hạng theo mức liên quan, mở rộng từ khóa theo từ điển đồng nghĩa,
   khớp gần đúng cách viết quốc tế / Việt hóa. Chỉ gồm hàm thuần, không đụng DOM.
   Xuất: window.DlsSearch. */
(function () {
  'use strict';

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
  // Chỉ giữ chữ và số, để "Viêm phổi, tác nhân" khớp cụm "viêm phổi"
  function clean(s) { return norm(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  // Khóa xếp hạng tên: bỏ chữ "Bệnh" đầu tên để "Bệnh tăng huyết áp vô căn" bắt đầu bằng "tăng huyết áp"
  function rankKey(s) { return clean(s).replace(/^benh /, ''); }
  // Mã so sánh không phân biệt dấu chấm và ký hiệu †/* (A00.0 = a000 = A00.0†)
  function codeKey(s) { return norm(s).replace(/[\s.†*]/g, ''); }
  // Khóa gần đúng: amoxicillin = amoxicilin, ceftriaxone = ceftriaxon, cephalexin = cefalexin
  function fold(s) {
    return clean(s).replace(/ph/g, 'f').replace(/th/g, 't').replace(/y/g, 'i')
      .replace(/([a-z])\1/g, '$1').replace(/\b([a-z]{4,})e\b/g, '$1');
  }

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

  function joinFields(r, fields) {
    return fields.map(function (f) { var v = r[f]; return Array.isArray(v) ? v.join(' ') : v; }).join(' ');
  }
  function prepare(records, cfg) {
    records.forEach(function (r) {
      r._code = cfg.codeField ? codeKey(r[cfg.codeField]) : '';
      r._hay = norm(joinFields(r, cfg.searchFields)) + (r._code ? ' ' + r._code : '');
      // Trường chính chỉ gồm tên: số trong từ khóa ("típ 2") không được khớp nhầm vào mã ("E10.2")
      if (cfg.primaryFields) {
        var fields = cfg.primaryFields.map(function (f) {
          var v = r[f]; return clean(Array.isArray(v) ? v.join(' ') : v);
        });
        r._mains = fields.map(rankKey);
        r._mainAll = fields.join(' ');
        r._fold = fold(r._mainAll);
      }
    });
    return records;
  }

  /* Bậc xếp hạng (nhỏ hơn đứng trước):
     0 đúng mã · 1 mã bắt đầu bằng từ khóa · 2 tên đúng cụm từ · 3 tên bắt đầu bằng cụm từ
     4 cụm từ ở đầu một từ trong tên · 5 mọi từ khóa ở đầu từ trong tên · 6 mọi từ khóa có trong tên
     7 chỉ khớp trường phụ (ghi chú, hướng dẫn, nội dung tài liệu) · -1 không khớp */
  function rankOf(r, t) {
    var i, m;
    for (i = 0; i < t.toks.length; i++) if (r._hay.indexOf(t.toks[i]) === -1) return -1;
    if (t.code && r._code) {
      if (r._code === t.code) return 0;
      if (r._code.indexOf(t.code) === 0) return 1;
    }
    if (!r._mains) return 6;
    var best = 7;
    for (i = 0; i < r._mains.length; i++) {
      m = r._mains[i];
      if (m === t.phrase) return 2;
      if (m.indexOf(t.phrase + ' ') === 0) best = Math.min(best, 3);
      else if ((' ' + m).indexOf(' ' + t.phrase) !== -1) best = Math.min(best, 4);
    }
    if (best < 7) return best;
    var padded = ' ' + r._mainAll;
    var starts = t.toks.every(function (k) { return padded.indexOf(' ' + clean(k)) !== -1; });
    if (starts) return 5;
    var inMain = t.toks.every(function (k) { return r._mainAll.indexOf(clean(k)) !== -1; });
    return inMain ? 6 : 7;
  }

  function passFilters(r, filterVals) {
    for (var f in filterVals) {
      var want = filterVals[f];
      if (!want) continue;
      var v = r[f];
      if (Array.isArray(v) ? v.indexOf(want) === -1 : v !== want) return false;
    }
    return true;
  }

  function scan(records, query, filterVals, bonus, seen) {
    var t = { toks: tokens(query), code: codeKey(query), phrase: rankKey(query) };
    records.forEach(function (r, idx) {
      if (!passFilters(r, filterVals)) return;
      var rank = rankOf(r, t);
      if (rank < 0) return;
      var hit = seen.get(r), score = rank + bonus;
      if (!hit) seen.set(r, { r: r, rank: score, idx: idx });
      else if (score < hit.rank) hit.rank = score;
    });
  }

  // Từ điển: khóa đã chuẩn hóa → mục. Bỏ qua mục đã tắt (active: false)
  function buildDict(d) {
    var map = {};
    ((d && d.entries) || []).forEach(function (e) {
      if (e.active !== false) map[clean(e.term)] = e;
    });
    return map;
  }

  // Tìm cụm trong từ khóa khớp nguyên từ với mục từ điển (ưu tiên cụm dài), trả về các truy vấn thay thế
  function expand(query, dict) {
    var w = clean(query).split(' ');
    if (!dict || !w[0]) return [];
    for (var len = Math.min(3, w.length); len > 0; len--) {
      for (var i = 0; i + len <= w.length; i++) {
        var e = dict[w.slice(i, i + len).join(' ')];
        if (!e) continue;
        return e.to.map(function (to) {
          return { q: w.slice(0, i).concat([to], w.slice(i + len)).join(' '), term: e.term, to: to, abbr: e.type === 'viết tắt' };
        });
      }
    }
    return [];
  }

  // Trả về { list, used: [{term, to}], fuzzy, toks } – toks gồm cả từ khóa mở rộng, dùng để tô sáng
  function run(records, query, filterVals, dict) {
    var toks = tokens(query);
    if (!toks.length) {
      return { list: records.filter(function (r) { return passFilters(r, filterVals || {}); }), used: [], fuzzy: false, toks: [] };
    }
    var seen = new Map();
    var alts = expand(query, dict);
    // Viết tắt ngắn ("THA") khớp lung tung giữa các từ ("thai"): chỉ tìm theo nghĩa đầy đủ
    if (!(alts[0] && alts[0].abbr)) scan(records, query, filterVals || {}, 0, seen);
    alts.forEach(function (a) {
      scan(records, a.q, filterVals || {}, -0.5, seen);
      toks = toks.concat(tokens(a.to));
    });

    var fuzzy = false;
    if (!seen.size) {
      [query].concat(alts.map(function (a) { return a.q; })).forEach(function (q) {
        var keys = fold(q).split(' ').filter(Boolean);
        records.forEach(function (r, idx) {
          if (!r._fold || seen.has(r) || !passFilters(r, filterVals || {})) return;
          if (keys.every(function (k) { return r._fold.indexOf(k) !== -1; })) seen.set(r, { r: r, rank: 6, idx: idx });
        });
      });
      fuzzy = seen.size > 0;
    }

    var out = Array.from(seen.values());
    out.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      // Cùng bậc trong tên: mã nhóm (3 ký tự: I10, J18) trước mã chi tiết, rồi tên ngắn sát từ khóa hơn;
      // còn lại giữ thứ tự gốc
      if (a.rank >= 1.5 && a.rank < 7 && a.r._mains && b.r._mains) {
        var ca = a.r._code && a.r._code.length <= 3 ? 0 : 1, cb = b.r._code && b.r._code.length <= 3 ? 0 : 1;
        var d = ca - cb || a.r._mains[0].length - b.r._mains[0].length;
        if (d) return d;
      }
      return a.idx - b.idx;
    });
    return {
      list: out.map(function (x) { return x.r; }),
      used: alts.map(function (a) { return { term: a.term, to: a.to }; }),
      fuzzy: fuzzy,
      toks: toks
    };
  }

  // Dòng giải thích khi từ khóa đã được hiểu theo từ điển hoặc khớp gần đúng; trả về '' nếu không có
  function noteHtml(res) {
    var parts = [];
    if (res.used.length) {
      parts.push('Tìm cả <b>' + esc(res.used.map(function (u) { return u.to; }).join(', ')) + '</b> cho “' + esc(res.used[0].term) + '” (từ điển chưa kiểm chứng).');
    }
    if (res.fuzzy) parts.push('Không có kết quả đúng chính tả, đang hiện kết quả gần đúng.');
    return parts.join(' ');
  }

  window.DlsSearch = {
    esc: esc, norm: norm, tokens: tokens, clean: clean, codeKey: codeKey, fold: fold, highlight: highlight,
    prepare: prepare, buildDict: buildDict, expand: expand, run: run, noteHtml: noteHtml
  };
})();
