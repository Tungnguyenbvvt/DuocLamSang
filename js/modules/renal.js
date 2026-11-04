/* Công thức chức năng thận và cân nặng (hàm thuần, không đụng DOM). Xuất: window.Renal.
   Mỗi đại lượng chỉ quy đổi đơn vị tại MỘT hàm (scrMgdl). Nguồn ghi ở SOURCES, đánh số theo trang.
   Người lớn (≥ 18 tuổi). Không lưu dữ liệu nhập. */
(function () {
  'use strict';

  var UMOL_PER_MGDL = 88.4; // creatinine: 1 mg/dL = 88,4 µmol/L

  // Điểm quy đổi duy nhất của creatinine huyết thanh → mg/dL
  function scrMgdl(value, unit) {
    if (unit === 'umol') return value / UMOL_PER_MGDL;
    if (unit === 'mgdl') return value;
    throw new Error('Đơn vị creatinine không hợp lệ: ' + unit);
  }

  // [1] Cockcroft–Gault: (140 − tuổi) × cân nặng / (72 × SCr), × 0,85 nếu nữ. Đơn vị mL/phút
  function crclCG(age, weightKg, scr, female) {
    return (140 - age) * weightKg / (72 * scr) * (female ? 0.85 : 1);
  }

  // [2] CKD-EPI 2021 (không dùng hệ số chủng tộc). Đơn vị mL/phút/1,73 m²
  function egfrCkdEpi2021(age, scr, female) {
    var k = female ? 0.7 : 0.9;
    var a = female ? -0.241 : -0.302;
    var r = scr / k;
    return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) *
      Math.pow(0.9938, age) * (female ? 1.012 : 1);
  }

  // [3] Devine: nam 50 kg, nữ 45,5 kg + 2,3 kg cho mỗi inch trên 60 inch (152,4 cm)
  function ibwDevine(heightCm, female) {
    return (female ? 45.5 : 50) + 2.3 * (heightCm / 2.54 - 60);
  }

  // [4] Cân nặng hiệu chỉnh: IBW + 0,4 × (cân nặng thực − IBW)
  function abw(weightKg, ibw) {
    return ibw + 0.4 * (weightKg - ibw);
  }

  // [5] Phân độ mức lọc cầu thận KDIGO (G1–G5) theo eGFR
  var KDIGO_G = [
    { id: 'G1', min: 90, label: 'Bình thường hoặc cao', en: 'Normal or high' },
    { id: 'G2', min: 60, label: 'Giảm nhẹ', en: 'Mildly decreased' },
    { id: 'G3a', min: 45, label: 'Giảm nhẹ đến vừa', en: 'Mildly to moderately decreased' },
    { id: 'G3b', min: 30, label: 'Giảm vừa đến nặng', en: 'Moderately to severely decreased' },
    { id: 'G4', min: 15, label: 'Giảm nặng', en: 'Severely decreased' },
    { id: 'G5', min: 0, label: 'Suy thận', en: 'Kidney failure' }
  ];
  function kdigoStage(egfr) {
    for (var i = 0; i < KDIGO_G.length; i++) if (egfr >= KDIGO_G[i].min) return KDIGO_G[i];
    return KDIGO_G[KDIGO_G.length - 1];
  }

  // [5] Nhóm albumin niệu KDIGO theo ACR (mg/g): A1 < 30, A2 30–300, A3 > 300
  var MGG_PER_MGMMOL = 8.84; // ACR: 1 mg/mmol = 8,84 mg/g
  // Điểm quy đổi duy nhất của ACR → mg/g
  function acrMgg(value, unit) {
    if (unit === 'mgmmol') return value * MGG_PER_MGMMOL;
    if (unit === 'mgg') return value;
    throw new Error('Đơn vị ACR không hợp lệ: ' + unit);
  }
  var KDIGO_A = [
    { id: 'A1', label: 'Bình thường đến tăng nhẹ', en: 'Normal to mildly increased', aer: '< 30', mgmmol: '< 3', mgg: '< 30' },
    { id: 'A2', label: 'Tăng vừa', en: 'Moderately increased', aer: '30–300', mgmmol: '3–30', mgg: '30–300' },
    { id: 'A3', label: 'Tăng nhiều', en: 'Severely increased', aer: '> 300', mgmmol: '> 30', mgg: '> 300' }
  ];
  function albuminStage(acr) { return KDIGO_A[acr < 30 ? 0 : acr <= 300 ? 1 : 2]; }

  // [5] Bản đồ nguy cơ tiên lượng CKD theo G × A
  var RISK_LABEL = { low: 'Nguy cơ thấp', mod: 'Nguy cơ tăng vừa', high: 'Nguy cơ cao', vhigh: 'Nguy cơ rất cao' };
  var KDIGO_RISK = {
    G1: ['low', 'mod', 'high'], G2: ['low', 'mod', 'high'], G3a: ['mod', 'high', 'vhigh'],
    G3b: ['high', 'vhigh', 'vhigh'], G4: ['vhigh', 'vhigh', 'vhigh'], G5: ['vhigh', 'vhigh', 'vhigh']
  };
  function kdigoRisk(g, a) { return KDIGO_RISK[g][+a.slice(1) - 1]; }

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

  // Nhận đầu vào thô, trả về { errors, warnings, result }
  function compute(input) {
    var errors = [], warnings = [];
    var age = +input.age, h = +input.height, w = +input.weight, raw = +input.scr;
    var female = input.sex === 'F';
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

    // ACR không bắt buộc: bỏ trống thì không phân nhóm A
    var acr = null;
    if (input.acr !== undefined && input.acr !== '' && input.acr !== null) {
      var acrRaw = +input.acr;
      if (!isFinite(acrRaw) || acrRaw < 0) warnings.push('ACR nhập sai, bỏ qua phân nhóm albumin niệu.');
      else acr = acrMgg(acrRaw, input.acrUnit);
    }

    var ibw = ibwDevine(h, female);
    var adj = abw(w, ibw);
    var egfr = egfrCkdEpi2021(age, scr, female);
    var stage = kdigoStage(egfr);
    var bsa = bsaMosteller(w, h);
    var b = bmi(w, h);
    var aStage = acr === null ? null : albuminStage(acr);
    return {
      errors: errors, warnings: warnings,
      result: {
        scrMgdl: scr, scrUmol: scr * UMOL_PER_MGDL,
        ibw: ibw, abw: adj, ratio: w / ibw,
        crcl: { tbw: crclCG(age, w, scr, female), ibw: crclCG(age, ibw, scr, female), abw: crclCG(age, adj, scr, female) },
        egfr: egfr, stage: stage, bsa: bsa, egfrAbs: egfrAbsolute(egfr, bsa),
        bmi: b, bmiWho: bmiClass(b, BMI_WHO), bmiAsia: bmiClass(b, BMI_ASIA),
        acrMgg: acr, aStage: aStage, risk: aStage ? kdigoRisk(stage.id, aStage.id) : null
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
    'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.'
  ];

  window.Renal = {
    scrMgdl: scrMgdl, crclCG: crclCG, egfrCkdEpi2021: egfrCkdEpi2021, ibwDevine: ibwDevine, abw: abw,
    kdigoStage: kdigoStage, KDIGO_G: KDIGO_G, acrMgg: acrMgg, KDIGO_A: KDIGO_A, albuminStage: albuminStage,
    KDIGO_RISK: KDIGO_RISK, RISK_LABEL: RISK_LABEL, kdigoRisk: kdigoRisk, bmi: bmi, bsaMosteller: bsaMosteller,
    egfrAbsolute: egfrAbsolute, BMI_WHO: BMI_WHO, BMI_ASIA: BMI_ASIA, bmiClass: bmiClass,
    compute: compute, round: round, SOURCES: SOURCES
  };
})();
