/* Công thức chức năng thận và cân nặng (hàm thuần, không đụng DOM). Xuất: window.Renal.
   Mỗi đại lượng chỉ quy đổi đơn vị tại MỘT hàm (scrMgdl, urineMgg). Nguồn ghi ở SOURCES, số [n] theo thứ tự đó.
   Công thức eGFR, phân giai đoạn G, nhóm A và bản đồ nguy cơ chép theo QĐ 2388/QĐ-BYT [9] và CV 8101/BYT-KCB [10].
   Người lớn (≥ 18 tuổi). Không lưu dữ liệu nhập. */
(function () {
  'use strict';

  var UMOL_PER_MGDL = 88.4;   // creatinine: mg/dL × 88,4 = µmol/L [9, Bảng 1]
  var MGMMOL_PER_MGG = 0.113; // ACR, PCR: mg/g × 0,113 = mg/mmol [9, Bảng 1]

  // Điểm quy đổi duy nhất của creatinine huyết thanh → mg/dL
  function scrMgdl(value, unit) {
    if (unit === 'umol') return value / UMOL_PER_MGDL;
    if (unit === 'mgdl') return value;
    throw new Error('Đơn vị creatinine không hợp lệ: ' + unit);
  }
  // Điểm quy đổi duy nhất của tỷ số niệu (uACR, uPCR) → mg/g
  function urineMgg(value, unit) {
    if (unit === 'mgmmol') return value / MGMMOL_PER_MGG;
    if (unit === 'mgg') return value;
    throw new Error('Đơn vị tỷ số niệu không hợp lệ: ' + unit);
  }

  // [1][9] Cockcroft–Gault: (140 − tuổi) × cân nặng × (0,85 nếu nữ) / (72 × SCr). Đơn vị mL/phút
  function crclCG(age, weightKg, scr, female) {
    return (140 - age) * weightKg / (72 * scr) * (female ? 0.85 : 1);
  }

  // [2][9] CKD-EPI 2021 (không dùng hệ số chủng tộc). Đơn vị mL/phút/1,73 m²
  function egfrCkdEpi2021(age, scr, female) {
    var k = female ? 0.7 : 0.9;
    var a = female ? -0.241 : -0.302;
    var r = scr / k;
    return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) *
      Math.pow(0.9938, age) * (female ? 1.012 : 1);
  }

  // [9] CKD-EPI 2009, dùng khi định lượng creatinine bằng kỹ thuật Jaffe. Bỏ hệ số người da đen
  function egfrCkdEpi2009(age, scr, female) {
    var k = female ? 0.7 : 0.9;
    var a = female ? -0.329 : -0.411;
    var r = scr / k;
    return 141 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.209) *
      Math.pow(0.993, age) * (female ? 1.018 : 1);
  }

  // [9] MDRD: A × SCr^−1,154 × tuổi^−0,203 × 0,742 nếu nữ; A = 186 (Jaffe) hoặc 175 (IDMS). Bỏ hệ số người da đen
  function egfrMdrd(age, scr, female, method) {
    return (method === 'jaffe' ? 186 : 175) * Math.pow(scr, -1.154) * Math.pow(age, -0.203) * (female ? 0.742 : 1);
  }

  // [2][9] CKD-EPI creatinine – cystatin C 2021. sCys: mg/L
  function egfrCrCys2021(age, scr, cys, female) {
    var k = female ? 0.7 : 0.9;
    var a = female ? -0.219 : -0.144;
    var r = scr / k, c = cys / 0.8;
    return 135 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -0.544) *
      Math.pow(Math.min(c, 1), -0.323) * Math.pow(Math.max(c, 1), -0.778) *
      Math.pow(0.9961, age) * (female ? 0.963 : 1);
  }

  // [3] Devine: nam 50 kg, nữ 45,5 kg + 2,3 kg cho mỗi inch trên 60 inch (152,4 cm)
  function ibwDevine(heightCm, female) {
    return (female ? 45.5 : 50) + 2.3 * (heightCm / 2.54 - 60);
  }

  // [4] Cân nặng hiệu chỉnh: IBW + 0,4 × (cân nặng thực − IBW)
  function abw(weightKg, ibw) {
    return ibw + 0.4 * (weightKg - ibw);
  }

  // [9, Bảng 7] Giai đoạn bệnh thận mạn theo MLCT; mô tả chép nguyên văn
  var KDIGO_G = [
    { id: 'G1', min: 90, range: '≥ 90', label: 'Tổn thương thận kèm MLCT bình thường hoặc tăng' },
    { id: 'G2', min: 60, range: '60–89', label: 'Tổn thương thận kèm giảm nhẹ MLCT' },
    { id: 'G3a', min: 45, range: '45–59', label: 'Giảm nhẹ đến vừa MLCT' },
    { id: 'G3b', min: 30, range: '30–44', label: 'Giảm vừa đến nặng MLCT' },
    { id: 'G4', min: 15, range: '15–29', label: 'Giảm nặng MLCT' },
    { id: 'G5', min: 0, range: '< 15 (hay lọc máu)', label: 'Suy thận' }
  ];
  function kdigoStage(egfr) {
    for (var i = 0; i < KDIGO_G.length; i++) if (egfr >= KDIGO_G[i].min) return KDIGO_G[i];
    return KDIGO_G[KDIGO_G.length - 1];
  }

  // [9, Bảng 8] Nhóm albumin/protein nước tiểu; ngưỡng chép nguyên văn theo từng đơn vị
  var KDIGO_A = [
    { id: 'A1', label: 'Bình thường đến tăng nhẹ', uacr: { mgg: '< 30', mgmmol: '< 3' }, upcr: { mgg: '< 150', mgmmol: '< 15' }, uae: '< 30', upe: '< 150', dip: 'Âm tính → vết' },
    { id: 'A2', label: 'Tăng vừa', uacr: { mgg: '30 – 300', mgmmol: '3 – 30' }, upcr: { mgg: '150 – 500', mgmmol: '15 – 50' }, uae: '30 – 300', upe: '150 – 500', dip: 'Vết → 1+' },
    { id: 'A3', label: 'Tăng nhiều', uacr: { mgg: '> 300', mgmmol: '> 30' }, upcr: { mgg: '> 500', mgmmol: '> 50' }, uae: '> 300', upe: '> 500', dip: '≥ 1+' }
  ];
  // Ngưỡng [thấp, cao] theo Bảng 8: A1 < thấp; A2 từ thấp đến cao; A3 > cao
  var A_CUT = { uacr: { mgg: [30, 300], mgmmol: [3, 30] }, upcr: { mgg: [150, 500], mgmmol: [15, 50] } };
  // So trực tiếp theo đơn vị người dùng nhập, không quy đổi, để không lệch tại ngưỡng
  function albuminStage(value, unit, kind) {
    var cut = A_CUT[kind || 'uacr'][unit];
    if (!cut) throw new Error('Đơn vị tỷ số niệu không hợp lệ: ' + unit);
    return KDIGO_A[value < cut[0] ? 0 : value <= cut[1] ? 1 : 2];
  }

  // [9, Bảng 9] Phân tầng nguy cơ và tần suất tái khám hàng năm theo KDIGO 2024 (G × A)
  var RISK_LABEL = { low: 'Nguy cơ thấp', mod: 'Nguy cơ vừa', high: 'Nguy cơ cao', vhigh: 'Nguy cơ rất cao', top: 'Nguy cơ cao nhất' };
  var KDIGO_RISK = {
    G1: ['low', 'mod', 'high'], G2: ['low', 'mod', 'high'], G3a: ['mod', 'high', 'vhigh'],
    G3b: ['high', 'vhigh', 'vhigh'], G4: ['vhigh', 'vhigh', 'top'], G5: ['top', 'top', 'top']
  };
  // Nội dung ô trong Bảng 9: hành động và số lần khám, xét nghiệm mỗi năm
  var KDIGO_CELL = {
    G1: ['Sàng lọc 1', 'Điều trị 1', 'Điều trị 3'], G2: ['Sàng lọc 1', 'Điều trị 1', 'Điều trị 3'],
    G3a: ['Điều trị 1', 'Điều trị 2', 'Điều trị 3'], G3b: ['Điều trị 2', 'Điều trị 3', 'Điều trị 3'],
    G4: ['Điều trị 3', 'Điều trị 3', 'Điều trị 4+'], G5: ['Điều trị 4+', 'Điều trị 4+', 'Điều trị 4+']
  };
  // Giải thích từng màu, chép nguyên văn phần dưới Bảng 9
  var RISK_TEXT = {
    low: 'Màu xanh lá (G1-2A1) tương ứng nguy cơ mức độ thấp (nếu không có các chỉ dấu khác về bệnh thận, cũng như không có BTM). Những BN thuộc nhóm này có thể được khám và xét nghiệm với tần suất của người khỏe mạnh, thông thường là hàng năm và có thể do bác sĩ không phải chuyên khoa Thận quản lý.',
    mod: 'Màu vàng (G1-2A2, G3aA1) tương ứng nguy cơ mức độ vừa. Những BN thuộc nhóm này cần được khám và xét nghiệm theo dõi ít nhất 1 lần mỗi năm và có thể do bác sĩ không phải chuyên khoa Thận quản lý.',
    high: 'Màu cam (G1-2A3, G3aA2 và G3bA1) tương ứng nguy cơ mức độ cao. Những BN thuộc nhóm này cần được khám và xét nghiệm theo dõi ít nhất 2 lần mỗi năm. Bác sĩ không phải chuyên khoa Thận có thể theo dõi nhưng cần chuyển khám bác sĩ chuyên khoa Thận nếu albumin nước tiểu tăng lên hoặc MLCT giảm xuống, nhất là ở người <70 tuổi.',
    vhigh: 'Màu đỏ (G3a-bA3, G3b-4A2 và G4A1) tương ứng nguy cơ mức độ rất cao. Những BN thuộc nhóm này cần được khám và xét nghiệm theo dõi ít nhất 3 lần mỗi năm và do bác sĩ chuyên khoa Thận theo dõi quản lý.',
    top: 'Màu đỏ sẫm (G4-5A3 và G5A1-2) tương ứng nguy cơ ở mức cao nhất. Tất cả BN thuộc nhóm này cần được bác sĩ chuyên khoa Thận theo dõi với tần suất khám và xét nghiệm tối thiểu 4 lần mỗi năm.'
  };
  function kdigoRisk(g, a) { return KDIGO_RISK[g][+a.slice(1) - 1]; }
  function kdigoCell(g, a) { return KDIGO_CELL[g][+a.slice(1) - 1]; }

  // BMI (kg/m²) và [8] diện tích da Mosteller (m²) = √(chiều cao cm × cân nặng kg / 3600)
  function bmi(weightKg, heightCm) { return weightKg / Math.pow(heightCm / 100, 2); }
  function bsaMosteller(weightKg, heightCm) { return Math.sqrt(heightCm * weightKg / 3600); }
  // eGFR không chuẩn hóa (mL/phút) = eGFR × BSA / 1,73
  function egfrAbsolute(egfr, bsa) { return egfr * bsa / 1.73; }

  // [6] Phân loại BMI của WHO; [7] ngưỡng cho người châu Á – Thái Bình Dương (WHO/IASO/IOTF 2000)
  var BMI_WHO = [
    { min: 40, label: 'Béo phì độ III' }, { min: 35, label: 'Béo phì độ II' }, { min: 30, label: 'Béo phì độ I' },
    { min: 25, label: 'Thừa cân' }, { min: 18.5, label: 'Bình thường' }, { min: 0, label: 'Thiếu cân' }
  ];
  var BMI_ASIA = [
    { min: 30, label: 'Béo phì độ II' }, { min: 25, label: 'Béo phì độ I' }, { min: 23, label: 'Thừa cân' },
    { min: 18.5, label: 'Bình thường' }, { min: 0, label: 'Thiếu cân' }
  ];
  function bmiClass(value, table) {
    for (var i = 0; i < table.length; i++) if (value >= table[i].min) return table[i];
    return table[table.length - 1];
  }

  // Khoảng kiểm tra đầu vào: creatinine ngoài khoảng thì chặn (thường do chọn nhầm đơn vị), còn lại cảnh báo
  var LIMITS = {
    age: { min: 18, max: 120, label: 'Tuổi', unit: 'năm' },
    height: { min: 100, max: 250, label: 'Chiều cao', unit: 'cm' },
    weight: { min: 20, max: 350, label: 'Cân nặng', unit: 'kg' },
    scr: { min: 0.1, max: 20, label: 'Creatinine', unit: 'mg/dL' }
  };
  function given(v) { return v !== undefined && v !== null && v !== ''; }

  // Nhận đầu vào thô, trả về { errors, warnings, result }
  function compute(input) {
    var errors = [], warnings = [];
    var age = +input.age, h = +input.height, w = +input.weight, raw = +input.scr;
    var female = input.sex === 'F';
    var method = input.method === 'jaffe' ? 'jaffe' : 'idms';
    [['age', age], ['height', h], ['weight', w], ['scrRaw', raw]].forEach(function (p) {
      if (!isFinite(p[1]) || p[1] <= 0) errors.push('Chưa nhập hoặc nhập sai: ' + ({ age: 'tuổi', height: 'chiều cao', weight: 'cân nặng', scrRaw: 'creatinine' })[p[0]] + '.');
    });
    if (input.sex !== 'M' && input.sex !== 'F') errors.push('Chưa chọn giới tính.');
    if (errors.length) return { errors: errors, warnings: warnings, result: null };

    var scr = scrMgdl(raw, input.unit);
    var vals = { age: age, height: h, weight: w, scr: scr };
    Object.keys(LIMITS).forEach(function (k) {
      var L = LIMITS[k];
      if (vals[k] < L.min || vals[k] > L.max) {
        (k === 'scr' || (k === 'age' && age < 18) ? errors : warnings).push(L.label + ' ' + round(vals[k], 2).toLocaleString('vi-VN') + ' ' + L.unit + ' ngoài khoảng ' + L.min + '–' + L.max + ' ' + L.unit + '.');
      }
    });
    if (age < 18) errors.push('Các công thức ở đây dành cho người lớn (≥ 18 tuổi).');
    if (errors.length) return { errors: errors, warnings: warnings, result: null };
    if (h < 152.4) warnings.push('Chiều cao dưới 152,4 cm: công thức Devine dựa trên chiều cao trên 60 inch, IBW tính ra kém tin cậy.');

    // Cystatin C và tỷ số niệu không bắt buộc: bỏ trống thì không tính phần tương ứng
    var cys = null;
    if (given(input.cys)) {
      if (!isFinite(+input.cys) || +input.cys <= 0) warnings.push('Cystatin C nhập sai, bỏ qua công thức creatinine – cystatin C.');
      else cys = +input.cys;
    }
    var urine = null;
    if (given(input.urine)) {
      var u = +input.urine, kind = input.urineKind === 'upcr' ? 'upcr' : 'uacr';
      if (!isFinite(u) || u < 0) warnings.push('Tỷ số niệu nhập sai, bỏ qua phân nhóm albumin/protein nước tiểu.');
      else urine = { kind: kind, value: u, unit: input.urineUnit, mgg: urineMgg(u, input.urineUnit), stage: albuminStage(u, input.urineUnit, kind) };
    }

    var ibw = ibwDevine(h, female);
    var adj = abw(w, ibw);
    var eq = {
      ckdEpi2021: egfrCkdEpi2021(age, scr, female),
      ckdEpi2009: egfrCkdEpi2009(age, scr, female),
      mdrd: egfrMdrd(age, scr, female, method),
      crCys: cys === null ? null : egfrCrCys2021(age, scr, cys, female)
    };
    // eGFR dùng để phân giai đoạn: có cystatin C thì dùng công thức kết hợp; không thì theo kỹ thuật định lượng creatinine [9]
    var primary = cys !== null ? 'crCys' : method === 'jaffe' ? 'ckdEpi2009' : 'ckdEpi2021';
    var egfr = eq[primary];
    var stage = kdigoStage(egfr);
    var bsa = bsaMosteller(w, h);
    var b = bmi(w, h);
    var aStage = urine ? urine.stage : null;
    return {
      errors: errors, warnings: warnings,
      result: {
        scrMgdl: scr, scrUmol: scr * UMOL_PER_MGDL, method: method,
        ibw: ibw, abw: adj, ratio: w / ibw,
        crcl: { tbw: crclCG(age, w, scr, female), ibw: crclCG(age, ibw, scr, female), abw: crclCG(age, adj, scr, female) },
        eq: eq, primary: primary, egfr: egfr, stage: stage, bsa: bsa, egfrAbs: egfrAbsolute(egfr, bsa),
        bmi: b, bmiWho: bmiClass(b, BMI_WHO), bmiAsia: bmiClass(b, BMI_ASIA),
        urine: urine, aStage: aStage,
        risk: aStage ? kdigoRisk(stage.id, aStage.id) : null,
        cell: aStage ? kdigoCell(stage.id, aStage.id) : null
      }
    };
  }

  function round(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }

  var SOURCES = [
    'Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron. 1976;16(1):31-41.',
    'Inker LA, Eneanya ND, Coresh J, et al. New creatinine- and cystatin C-based equations to estimate GFR without race. N Engl J Med. 2021;385(19):1737-49.',
    'Devine BJ. Gentamicin therapy. Drug Intell Clin Pharm. 1974;8:650-5.',
    'Bauer LA, Edwards WA, Dellinger EP, Simonowitz DA. Influence of weight on aminoglycoside pharmacokinetics in normal weight and morbidly obese patients. Eur J Clin Pharmacol. 1983;24(5):643-7.',
    'Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group. KDIGO 2012 clinical practice guideline for the evaluation and management of chronic kidney disease. Kidney Int Suppl. 2013;3(1):1-150.',
    'World Health Organization. Obesity: preventing and managing the global epidemic. Report of a WHO consultation. WHO Technical Report Series 894. Geneva: WHO; 2000.',
    'WHO Western Pacific Region, International Association for the Study of Obesity, International Obesity Task Force. The Asia-Pacific perspective: redefining obesity and its treatment. Sydney: Health Communications Australia; 2000.',
    'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.',
    'Bộ Y tế. Quyết định số 2388/QĐ-BYT ngày 12/8/2024 ban hành tài liệu chuyên môn “Hướng dẫn chẩn đoán và điều trị bệnh thận mạn và một số bệnh lý thận”. Hà Nội: Bộ Y tế; 2024. Bảng 1, 5, 6, 7, 8, 9 (tr. 16, 23–27).',
    'Bộ Y tế. Công văn số 8101/BYT-KCB ngày 30/12/2024 về việc hướng dẫn công thức tính eGFR, uACR và việc tần suất theo dõi bệnh thận mạn. Hà Nội: Bộ Y tế; 2024.'
  ];

  window.Renal = {
    scrMgdl: scrMgdl, urineMgg: urineMgg, crclCG: crclCG, egfrCkdEpi2021: egfrCkdEpi2021, egfrCkdEpi2009: egfrCkdEpi2009,
    egfrMdrd: egfrMdrd, egfrCrCys2021: egfrCrCys2021, ibwDevine: ibwDevine, abw: abw,
    kdigoStage: kdigoStage, KDIGO_G: KDIGO_G, KDIGO_A: KDIGO_A, albuminStage: albuminStage,
    KDIGO_RISK: KDIGO_RISK, KDIGO_CELL: KDIGO_CELL, RISK_LABEL: RISK_LABEL, RISK_TEXT: RISK_TEXT, kdigoRisk: kdigoRisk, kdigoCell: kdigoCell,
    bmi: bmi, bsaMosteller: bsaMosteller, egfrAbsolute: egfrAbsolute, BMI_WHO: BMI_WHO, BMI_ASIA: BMI_ASIA, bmiClass: bmiClass,
    compute: compute, round: round, SOURCES: SOURCES
  };
})();
