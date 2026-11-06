# Trích Danh mục tương tác thuốc chống chỉ định (QĐ 5948/QĐ-BYT ngày 30/12/2021) → data/tuong-tac-5948.json
#
# Đầu vào: bản Word của quyết định lưu thành "Web Page, Filtered" (.htm). Chuyển bằng Word:
#   powershell: $w=New-Object -ComObject Word.Application; $d=$w.Documents.Open('<.doc>',$false,$true);
#               $d.SaveAs2('<out>.htm', 10); $d.Close($false); $w.Quit()
# Chạy: python tools/import-qd5948/build.py <out>.htm
#
# Giữ nguyên văn bản; chỉ sửa các tên thuốc bị ngắt giữa từ khi chuyển định dạng (FIXES, đã đối chiếu bản scan).
# Mức độ lấy theo chữ in đậm ở cột tên thuốc (mục 3.1, 3.2 của văn bản).
import json, re, sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUP = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')

# Tên bị ngắt giữa từ trong bản Word (bản scan viết liền)
FIXES = {
    'Levodopa/carbi dopa': 'Levodopa/carbidopa',
    'Sacubitril/valsar tan': 'Sacubitril/valsartan',
    'Dextromethorp han': 'Dextromethorphan',
    'dihydroergota min': 'dihydroergotamin',
    'methylergomet rin': 'methylergometrin',
    'Sofosbuvir/ledi pasvir': 'Sofosbuvir/ledipasvir',
    'Peginterferon- alpha': 'Peginterferon-alpha',
    'dihydroartemisini n': 'dihydroartemisinin',
    'Piperaquin/ dihydroartemisinin': 'Piperaquin/dihydroartemisinin',
    'levodopa/ carbidopa': 'levodopa/carbidopa',
    'dextromethorpha n': 'dextromethorphan',
    'elba svir': 'elbasvir',
    'lumefan trin': 'lumefantrin',
    'methylergometr in': 'methylergometrin',
    'Lopinavir/rito avir': 'Lopinavir/ritonavir',  # bản Word mất chữ n; bản scan STT 521 ghi Lopinavir/ritonavir
    'Levomeprom azin': 'Levomepromazin',
    'Piperaquin/di hydroartemisinin': 'Piperaquin/dihydroartemisinin',
}


class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.stack, self.cell = [], [], None
        self.bold = self.sup = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.stack.append([])
        elif tag == 'tr' and self.stack:
            self.stack[-1].append([])
        elif tag in ('td', 'th') and self.stack:
            self.cell = {'text': '', 'chars': 0, 'boldChars': 0}
        elif tag in ('b', 'strong'):
            self.bold += 1
        elif tag == 'sup':
            self.sup += 1
        elif tag in ('p', 'br') and self.cell is not None and self.cell['text'].strip() and not self.cell['text'].endswith('\n'):
            self.cell['text'] += '\n'

    def handle_endtag(self, tag):
        if tag == 'table' and self.stack:
            self.tables.append(self.stack.pop())
        elif tag in ('td', 'th') and self.cell is not None and self.stack:
            self.stack[-1][-1].append(self.cell)
            self.cell = None
        elif tag in ('b', 'strong'):
            self.bold -= 1
        elif tag == 'sup':
            self.sup -= 1

    def handle_data(self, d):
        if self.cell is None:
            return
        d = d.replace('\xa0', ' ').replace('\r', ' ').replace('\n', ' ')
        if self.sup:
            d = d.strip().translate(SUP)
        self.cell['text'] += d
        n = len(d.strip())
        self.cell['chars'] += n
        if self.bold > 0:
            self.cell['boldChars'] += n


def clean(t):
    t = re.sub(r'[ \t]+', ' ', re.sub(r' *\n *', '\n', t)).strip()
    for a, b in FIXES.items():
        t = t.replace(a, b)
    return t


def rows_of(table):
    return [[{'text': clean(c['text']), 'bold': c['chars'] > 0 and c['boldChars'] >= 0.9 * c['chars']} for c in r] for r in table]


src = Path(sys.argv[1])
raw = src.read_bytes()
enc = re.search(rb'charset=([\w-]+)', raw)
p = Tables()
p.feed(raw.decode(enc.group(1).decode() if enc else 'utf-8', errors='strict'))
T = [rows_of(t) for t in p.tables]

def find(header0, header1):
    for t in T:
        if t and t[0] and t[0][0]['text'] == header0 and len(t[0]) > 1 and t[0][1]['text'].startswith(header1):
            return t
    raise SystemExit('Không thấy bảng: ' + header1)

t31 = find('STT', 'Hoạt chất 1')
t32 = find('STT', 'Tên thuốc/ nhóm thuốc 1')
alias_t = next(t for t in T if t and t[0][0]['text'].startswith('Tên hoạt chất sử dụng'))

def record(kind, r):
    stt = r[0]['text']
    assert r[1]['bold'] == r[2]['bold'] or kind == 'G', ('mức độ hai cột khác nhau', kind, stt)
    return {
        'id': kind + '-' + stt, 'table': '3.1' if kind == 'I' else '3.2', 'stt': int(stt),
        'a': r[1]['text'], 'b': r[2]['text'],
        'level': 'cond' if r[1]['bold'] else 'abs',
        'mech': r[3]['text'], 'effect': r[4]['text'], 'manage': r[5]['text'],
    }

recs = [record('I', r) for r in t31[1:]] + [record('G', r) for r in t32[1:]]

# Nối từ bị ngắt khi chuyển định dạng ("Pseudoephed rin" → "Pseudoephedrin"): chỉ nối khi từ ghép
# có xuất hiện nguyên vẹn ở chỗ khác trong văn bản và ít nhất một mảnh không phải là từ có nghĩa
FIELDS = ('a', 'b', 'mech', 'effect', 'manage')
vocab = {}
for r in recs:
    for f in FIELDS:
        for w in re.findall(r'[A-Za-zÀ-ỹ]+', r[f]):
            vocab[w.lower()] = vocab.get(w.lower(), 0) + 1
joined = []
def rejoin(text):
    text = re.sub(r'(?<=[A-Za-zÀ-ỹ])/[ \n](?=[A-Za-zÀ-ỹ])', '/', text)
    def merge(m):
        a, b = m.group(1), m.group(2)
        w = (a + b).lower()
        fa, fb = vocab.get(a.lower(), 0), vocab.get(b.lower(), 0)
        fw = vocab.get(w, 0)
        if fw and (not fa or not fb or min(fa, fb) < 3 or fw > min(fa, fb)):
            joined.append(m.group(0) + ' → ' + a + b)
            return a + b
        return m.group(0)
    return re.sub(r'\b([A-Za-zÀ-ỹ]{2,})[ \n]([a-zà-ỹ]{1,8})\b', merge, text)
for r in recs:
    for f in FIELDS:
        r[f] = rejoin(r[f])
assert [r['stt'] for r in recs if r['table'] == '3.1'] == list(range(1, 634)), 'STT bảng 3.1 không liên tục'
assert [r['stt'] for r in recs if r['table'] == '3.2'] == list(range(1, 69)), 'STT bảng 3.2 không liên tục'

# Chú thích cuối bảng 3.2: các hoạt chất cụ thể của nhóm (1–7); chú thích 4 có bảng con thuốc 1 × thuốc 2 (kéo dài QT)
notes, qt = {}, []
note_t = next(t for t in T if t and t[0] and t[0][0]['text'] == '1' and len(t[0]) == 2 and 'NSAID' in t[0][1]['text'])
# Bản Word lồng bảng con QT ngay trong bảng chú thích: dòng có cột đầu là tên thuốc (không phải số) thuộc bảng con
for r in note_t:
    if not r or not r[0]['text'] or len(r) < 2 or r[1]['text'] == 'Thuốc 1':
        continue
    if re.fullmatch(r'\d+', r[0]['text']):
        notes[r[0]['text']] = r[1]['text']
    else:
        qt.append({'a': r[0]['text'].replace('\n', ' '), 'b': [x.strip() for x in re.split(r',\s*', r[1]['text'].replace('\n', ' ')) if x.strip()]})
assert sorted(notes) == [str(i) for i in range(1, 8)], notes.keys()

aliases = [[r[0]['text'].replace('\n', ' '), r[1]['text'].replace('\n', ' ')] for r in alias_t[1:]]

LEVELS = {
    'abs': 'Các cặp tương tác không được in đậm (các tương tác còn lại) là các tương tác cần được chống chỉ định trong tất cả các tình huống lâm sàng và trên tất cả các đối tượng bệnh nhân khác nhau.',
    'cond': 'Các cặp tương tác có hoạt chất được in đậm là các cặp tương tác chỉ chống chỉ định trong một số bối cảnh lâm sàng hoặc trên một số đối tượng bệnh nhân cụ thể hoặc nhìn chung tốt nhất nên tránh phối hợp, tuy nhiên trong một số tình huống nhất định, khi không còn lựa chọn thay thế và bắt buộc sử dụng đồng thời, phối hợp thuốc vẫn có thể được cân nhắc sau khi được bác sĩ điều trị cân nhắc, đánh giá cẩn thận cân bằng lợi ích/nguy cơ.'
}

out = {
    'version': '1.0.0',
    'updated': date.today().isoformat(),
    'source': 'Bộ Y tế. Quyết định số 5948/QĐ-BYT ngày 30/12/2021 về việc ban hành Danh mục tương tác thuốc chống chỉ định trong thực hành lâm sàng tại các cơ sở khám bệnh, chữa bệnh. Hà Nội: Bộ Y tế; 2021.',
    'extraction': 'Trích tự động từ bản Word (5948_QD-BYT_499272.doc) do người dùng cung cấp bằng tools/import-qd5948/build.py; mức độ theo chữ in đậm; đã sửa ' + str(len(FIXES)) + ' tên thuốc bị ngắt giữa từ khi chuyển định dạng; đối chiếu mẫu với bản scan có chữ ký.',
    'review': 'chưa kiểm chứng',
    'levels': LEVELS,
    'aliases': aliases,
    'notes': notes,
    'qt': qt,
    'records': recs,
}
dest = ROOT / 'data' / 'tuong-tac-5948.json'
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print('Đã nối', len(joined), 'chỗ:', sorted(set(joined)))
print('3.1:', sum(r['table'] == '3.1' for r in recs), '· 3.2:', sum(r['table'] == '3.2' for r in recs),
      '· in đậm:', sum(r['level'] == 'cond' for r in recs), '· chú thích:', len(notes), '· QT:', len(qt), '· tên khác:', len(aliases))
print(dest.stat().st_size, 'byte')
