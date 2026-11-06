/* Tra cứu tương tác thuốc chống chỉ định theo QĐ 5948/QĐ-BYT (dữ liệu: data/tuong-tac-5948.json).
   Hàm thuần, không đụng DOM. Xuất: window.Interact.
   Cách khớp: tên thuốc nhập vào (đã bỏ dấu, bỏ ký tự đặc biệt) phải xuất hiện nguyên từ trong tên thuốc/nhóm thuốc
   của một phía; với nhóm có chú thích (¹…⁷) thì tìm cả trong danh sách hoạt chất của chú thích.
   Riêng cặp “Thuốc gây kéo dài khoảng QT⁴ × Thuốc gây kéo dài khoảng QT⁴” chỉ khớp theo bảng con của chú thích 4. */
(function () {
  'use strict';

  var SUP = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  var QT_NOTE = '4';

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  // Khóa so khớp: chỉ chữ và số, cách nhau một dấu cách, có dấu cách hai đầu để so nguyên từ
  function key(s) {
    return ' ' + norm(String(s || '').replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, ' ')).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  }
  function notesOf(text) {
    var out = [];
    String(text).replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, function (c) { out.push(SUP[c]); return c; });
    return out;
  }

  function build(data) {
    var alias = {};
    (data.aliases || []).forEach(function (p) {
      var a = key(p[0]).trim(), b = key(p[1]).trim();
      (alias[a] = alias[a] || []).push(b);
      (alias[b] = alias[b] || []).push(a);
    });
    var qt = (data.qt || []).map(function (q) {
      return { a: q.a, aKey: key(q.a), b: q.b, bKeys: q.b.map(key) };
    });
    var recs = data.records.map(function (r) {
      var sides = [r.a, r.b].map(function (t) {
        var ns = notesOf(t);
        var isQt = ns.indexOf(QT_NOTE) !== -1;
        var extra = ns.filter(function (n) { return n !== QT_NOTE; }).map(function (n) { return data.notes[n] || ''; }).join(' ');
        return { text: t, notes: ns, qt: isQt, hay: key(t + ' ' + extra) };
      });
      return { r: r, sides: sides, qt: sides[0].qt && sides[1].qt };
    });
    var idx = { data: data, recs: recs, qt: qt, alias: alias };
    idx.vocab = vocab(idx);
    return idx;
  }

  // Các khóa tương đương của một tên thuốc (tên trong danh mục và tên khác ở bảng tên khác)
  function keysOf(idx, name) {
    var k = key(name).trim();
    if (k.length < 3) return [];
    return [k].concat(idx.alias[k] || []);
  }
  function hit(hay, keys) {
    return keys.some(function (k) { return hay.indexOf(' ' + k + ' ') !== -1; });
  }

  // Cặp QT: thuốc x khớp cột “Thuốc 1”, y khớp danh sách “Thuốc 2” của cùng dòng (hoặc ngược lại)
  function qtPair(idx, kx, ky) {
    for (var i = 0; i < idx.qt.length; i++) {
      var q = idx.qt[i];
      if (hit(q.aKey, kx) && q.bKeys.some(function (b) { return hit(b, ky); })) return q;
      if (hit(q.aKey, ky) && q.bKeys.some(function (b) { return hit(b, kx); })) return q;
    }
    return null;
  }
  function qtAny(idx, kx) {
    return idx.qt.filter(function (q) { return hit(q.aKey, kx) || q.bKeys.some(function (b) { return hit(b, kx); }); });
  }

  // Tương tác giữa 2 thuốc x, y. Trả về [{ rec, qt }]
  function pair(idx, x, y) {
    var kx = keysOf(idx, x), ky = keysOf(idx, y), out = [];
    if (!kx.length || !ky.length) return out;
    idx.recs.forEach(function (e) {
      if (e.qt) {
        var q = qtPair(idx, kx, ky);
        if (q) out.push({ rec: e.r, qt: q });
        return;
      }
      var a = e.sides[0].hay, b = e.sides[1].hay;
      if ((hit(a, kx) && hit(b, ky)) || (hit(a, ky) && hit(b, kx))) out.push({ rec: e.r, qt: null });
    });
    return out;
  }

  // Kiểm tra mọi cặp trong danh sách thuốc (bỏ ô trống, bỏ thuốc trùng)
  function check(idx, drugs) {
    var list = [], seen = {};
    drugs.forEach(function (d) {
      var k = key(d).trim();
      if (k.length >= 3 && !seen[k]) { seen[k] = 1; list.push(String(d).trim()); }
    });
    var out = [];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        pair(idx, list[i], list[j]).forEach(function (h) { out.push({ x: list[i], y: list[j], rec: h.rec, qt: h.qt }); });
      }
    }
    out.sort(function (p, q) { return (p.rec.level === 'abs' ? 0 : 1) - (q.rec.level === 'abs' ? 0 : 1); });
    return { drugs: list, hits: out };
  }

  // Mọi tương tác của một thuốc. Trả về [{ rec, partner, qt }]
  function lookup(idx, name) {
    var k = keysOf(idx, name), out = [];
    if (!k.length) return out;
    idx.recs.forEach(function (e) {
      if (e.qt) {
        qtAny(idx, k).forEach(function (q) {
          var self = hit(q.aKey, k);
          out.push({ rec: e.r, partner: self ? q.b.join(', ') : q.a, qt: q });
        });
        return;
      }
      if (hit(e.sides[0].hay, k)) out.push({ rec: e.r, partner: e.r.b, qt: null });
      else if (hit(e.sides[1].hay, k)) out.push({ rec: e.r, partner: e.r.a, qt: null });
    });
    return out;
  }

  // Danh sách tên gợi ý: tên hoạt chất bảng 3.1, hoạt chất liệt kê trong ngoặc/chú thích của bảng 3.2, bảng QT, tên khác
  function vocab(idx) {
    var d = idx.data, names = {};
    function add(n) {
      n = String(n).replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '').replace(/\s+/g, ' ').trim().replace(/[.;:]+$/, '');
      if (n.length < 3 || /^(các|thuốc|dẫn chất|nhóm|opioid)\b/i.test(n) || !/^[A-Za-zÀ-ỹ]/.test(n)) return;
      var k = key(n).trim();
      if (!names[k]) names[k] = n.charAt(0).toUpperCase() + n.slice(1);
    }
    function addList(text) {
      String(text).split(/[,;:\n]|\s\(|\)/).forEach(function (s) { add(s.replace(/^\s*(và|hoặc)\s+/, '')); });
    }
    d.records.forEach(function (r) {
      if (r.table === '3.1') { add(r.a); add(r.b); }
      else {
        [r.a, r.b].forEach(function (t) {
          var inner = t.match(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g) || [];
          inner.forEach(function (p) { addList(p.slice(1, -1)); });
          var colon = t.split(':').slice(1).join(':');
          if (colon) addList(colon);
          if (!inner.length && !colon) add(t);
        });
      }
    });
    Object.keys(d.notes).forEach(function (n) { addList(d.notes[n].split(':').slice(1).join(':')); });
    idx.qt.forEach(function (q) { add(q.a); q.b.forEach(add); });
    (d.aliases || []).forEach(function (p) { add(p[1]); });
    return Object.keys(names).map(function (k) {
      return { name: names[k], key: k, count: lookup(idx, names[k]).length };
    }).filter(function (v) { return v.count > 0; });
  }

  // Gợi ý theo chuỗi gõ: khớp đầu tên trước, rồi khớp giữa tên; cùng nhóm thì nhiều tương tác trước
  function suggest(idx, q, max) {
    var k = key(q).trim();
    if (!k) return [];
    var out = idx.vocab.map(function (v) {
      var at = (' ' + v.key).indexOf(' ' + k);
      return { v: v, rank: v.key.indexOf(k) === 0 ? 0 : at !== -1 ? 1 : v.key.indexOf(k) !== -1 ? 2 : -1 };
    }).filter(function (x) { return x.rank >= 0; });
    out.sort(function (a, b) { return a.rank - b.rank || b.v.count - a.v.count || a.v.name.localeCompare(b.v.name, 'vi'); });
    return out.slice(0, max || 12).map(function (x) { return x.v; });
  }

  window.Interact = { norm: norm, key: key, build: build, pair: pair, check: check, lookup: lookup, suggest: suggest };
})();
