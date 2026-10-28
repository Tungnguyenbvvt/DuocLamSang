/* Dựng lại bảng ICD-10 (Phụ lục TT 06/2026/TT-BYT) từ tọa độ chữ do PDF.js trích.
   Cột cố định theo x (điểm PDF). Mỗi bản ghi neo theo mục "mã bệnh" ở cột 18 (x≈473). */
(function () {
  var COLS = [ // [số cột, x bắt đầu, khóa]
    [1, 0, 'stt'], [2, 30, 'chapter'], [3, 49, 'range'], [4, 68, 'chapterEn'], [5, 113, 'chapterVi'],
    [6, 155, 'block'], [7, 174, 'blockEn'], [8, 215, 'blockVi'], [9, 258, 'c9'], [15, 386, 'c15'],
    [16, 403, 'c16'], [17, 439, 'c17'],
    [18, 470, 'code'], [19, 488, 'codeNoDot'], [20, 507, 'nameEn'], [21, 545, 'guideEn'],
    [22, 589, 'name'], [23, 640, 'guide'],
    [24, 675, 'f24'], [25, 700, 'f25'], [26, 725, 'f26'], [27, 750, 'f27'], [28, 775, 'f28'], [29, 798, 'f29']
  ];
  function colOf(x) { var c = null; for (var i = 0; i < COLS.length; i++) if (COLS[i][1] <= x) c = COLS[i]; return c; }

  // Ghép các mảnh trên cùng một dòng: liền nhau (khe < 0.8 pt) thì nối thẳng, ngược lại thêm 1 dấu cách
  function joinLine(items) {
    items.sort(function (a, b) { return a[0] - b[0]; });
    var s = '', end = null;
    items.forEach(function (it) {
      if (end !== null) s += (it[0] - end < 0.8 ? '' : ' ');
      s += it[4];
      end = it[0] + it[2];
    });
    var f = items[0];
    return { t: s.replace(/\s+/g, ' ').trim(), right: end, left: f[0], firstW: f[4].length ? f[2] / f[4].length : 2 };
  }
  // Trả về các dòng {t, y, right} của một ô, từ trên xuống
  function groupLines(items) {
    items.sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; });
    var lines = [], cur = null;
    items.forEach(function (it) {
      if (!cur || Math.abs(cur.y - it[1]) > 1.5) { cur = { y: it[1], items: [] }; lines.push(cur); }
      cur.items.push(it);
    });
    return lines.map(function (l) { var j = joinLine(l.items); j.y = l.y; return j; }).filter(function (l) { return l.t; });
  }
  function colBounds(key) {
    for (var i = 0; i < COLS.length; i++) if (COLS[i][2] === key) return { start: COLS[i][1], width: (COLS[i + 1] ? COLS[i + 1][1] : 842) - COLS[i][1] };
  }

  function parse(pages) {
    var recs = [], cur = null;
    pages.forEach(function (pg) {
      var items = pg.items.filter(function (it) { return it[1] < 560 && !(pg.p === 1 && it[1] > 480); });
      var anchors = items.filter(function (it) { return it[0] >= 470 && it[0] < 488; })
        .sort(function (a, b) { return b[1] - a[1]; });
      // Mục nằm trên neo đầu tiên của trang = phần tiếp nối của bản ghi cuối trang trước
      var buckets = anchors.map(function (a) { return { y: a[1], page: pg.p, items: [] }; });
      items.forEach(function (it) {
        var target = null;
        for (var i = 0; i < buckets.length; i++) if (it[1] <= buckets[i].y + 0.3) target = buckets[i];
        if (target) target.items.push(it);
        else if (cur) cur.items.push(it);
      });
      buckets.forEach(function (b) { if (cur) recs.push(cur); cur = b; });
    });
    if (cur) recs.push(cur);
    return recs.map(function (b) {
      var byCol = {};
      b.items.forEach(function (it) { var c = colOf(it[0]); (byCol[c[2]] = byCol[c[2]] || []).push(it); });
      var o = { page: b.page, _lines: {} };
      Object.keys(byCol).forEach(function (k) { o._lines[k] = groupLines(byCol[k]); });
      return o;
    });
  }

  // Ghép các dòng xuống dòng trong một ô. Mặc định 1 dấu cách. Dính liền khi:
  //  (a) dòng trước kết thúc bằng chữ + "-" và dòng sau bắt đầu bằng chữ thường (từ ghép có gạch nối), hoặc
  //  (b) dòng trước chỉ có 1 cụm không dấu cách và lấp đầy bề rộng cột -> Excel ngắt giữa từ vì từ dài hơn cột,
  //      mảnh sau bắt đầu bằng chữ thường, và mảnh trước không phải từ đã biết (hoặc từ ghép là từ đã biết).
  // Từ điển: mọi từ trong các dòng có từ 2 cụm trở lên, trừ cụm đầu dòng (có thể là đuôi của từ bị ngắt).
  function buildDict(recs) {
    var d = Object.create(null);
    recs.forEach(function (r) {
      Object.keys(r._lines).forEach(function (k) {
        r._lines[k].forEach(function (l, j, arr) {
          var w = l.t.split(' ');
          // Cụm đầu dòng chỉ chắc là từ trọn vẹn khi dòng trước có nhiều cụm (ngắt tại dấu cách)
          var from = (j > 0 && arr[j - 1].t.indexOf(' ') !== -1) ? 0 : 1;
          for (var i = from; i < w.length; i++) { var t = norm(w[i]); if (t) d[t] = (d[t] || 0) + 1; }
        });
      });
    });
    return d;
  }
  function norm(t) { return t.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  var glued = [], overlaps = [], INNER = {};
  // Ngoại lệ đã rà tay: hai từ trọn vẹn tình cờ lấp đầy dòng
  var KEEP_SPACE = { 'polymorphonuclear|neutrophils': true };
  // Bề rộng dòng lớn nhất quan sát được trong mỗi cột = chỗ trống tối đa của ô
  function measure(recs) {
    recs.forEach(function (r) {
      Object.keys(r._lines).forEach(function (k) {
        r._lines[k].forEach(function (l) { INNER[k] = Math.max(INNER[k] || 0, l.right - l.left); });
      });
    });
  }
  function joinCell(lines, dict, key, code) {
    var s = '';
    lines.forEach(function (l, i) {
      if (i === 0) { s = l.t; return; }
      var prev = lines[i - 1];
      if (prev.y - l.y < 4) overlaps.push(code + ' cột ' + key + ': "' + prev.t + '" / "' + l.t + '"');
      var prevLast = s.split(' ').pop(), nextFirst = l.t.split(' ')[0];
      var a = norm(prevLast), b = norm(nextFirst), ab = norm(prevLast + nextFirst);
      // Ngắt giữa từ chỉ xảy ra khi dòng trước là 1 cụm duy nhất VÀ ký tự kế tiếp không còn vừa dòng đó
      var forced = prev.t.indexOf(' ') === -1 && (prev.right - prev.left) + l.firstW > INNER[key] + 0.3;
      var glue = false;
      if (KEEP_SPACE[prevLast + '|' + nextFirst]) glue = false;
      else if (/\p{L}-$/u.test(prevLast) && /^\p{Ll}/u.test(nextFirst)) glue = true;
      // Khoảng mã/số bị ngắt sau gạch nối: "(I60-" + "I69)", "6-" + "11"
      else if (/[A-Z]\d\d(\.\d+)?[†*]?-$/.test(prevLast) && /^[A-Z]\d\d/.test(nextFirst)) glue = true;
      else if (/\d-$/.test(prevLast) && /^\d/.test(nextFirst)) glue = true;
      else if (forced && /\p{L}$/u.test(prevLast) && /^[\p{Ll})\]]/u.test(nextFirst) &&
               (dict[ab] || !(dict[b] && b.length >= 2))) glue = true;
      if (glue) glued.push(key + ': ' + prevLast + '|' + nextFirst);
      s += (glue ? '' : ' ') + l.t;
    });
    return s.normalize('NFC');
  }

  function finalize(raw) {
    var dict = buildDict(raw);
    measure(raw);
    var flagsKey = { f24: 'notPrimary', f25: 'discouragedPrimary', f26: 'useSubcode', f27: 'mortalityOnly', f28: 'female', f29: 'male' };
    var problems = [], chapters = {};
    var out = raw.map(function (r, idx) {
      var code0 = r._lines.code ? r._lines.code[0].t : '?';
      var get = function (k) { return r._lines[k] ? joinCell(r._lines[k], dict, k, code0) : ''; };
      var o = { stt: get('stt'), code: get('code'), codeNoDot: get('codeNoDot'), chapter: get('chapter'), range: get('range'),
        name: get('name'), nameEn: get('nameEn'), guide: get('guide'), guideEn: get('guideEn'), page: r.page };
      Object.keys(flagsKey).forEach(function (f) {
        var v = get(f);
        if (v) {
          o[flagsKey[f]] = true;
          if (v !== o.code) problems.push('Cờ ' + f + ' của ' + o.code + ' ghi "' + v + '"');
        }
      });
      if (!chapters[o.chapter]) chapters[o.chapter] = { id: o.chapter, range: o.range, nameEn: get('chapterEn'), name: get('chapterVi') };
      if (+o.stt !== idx + 1) problems.push('STT ' + o.stt + ' ở vị trí ' + (idx + 1));
      // † (mã nguyên nhân) và * (mã biểu hiện) là ký hiệu ICD-10 hợp lệ, giữ nguyên trong mã
      if (o.code.replace('.', '').replace(/[†*]/g, '') !== o.codeNoDot.replace(/[†*]/g, '')) problems.push('Mã ' + o.code + ' khác mã không dấu ' + o.codeNoDot);
      if (!/^[A-Z]\d\d(\.\d{1,2})?[†*]?$/.test(o.code)) problems.push('Mã lạ: ' + o.code + ' (STT ' + o.stt + ')');
      if (!o.name) problems.push('Thiếu tên Việt: ' + o.code);
      if (!o.nameEn) problems.push('Thiếu tên Anh: ' + o.code);
      return o;
    });
    return { records: out, chapters: Object.keys(chapters).map(function (k) { return chapters[k]; }), problems: problems, glued: glued, overlaps: overlaps };
  }

  window.ICDParse = { parse: parse, finalize: finalize };
})();
