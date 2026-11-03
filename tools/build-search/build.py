# Tạo data/doc-text.json: danh sách từ (đã bỏ dấu, không trùng) trong từng tài liệu, để ô tìm kiếm
# ở sidebar tìm được theo nội dung. Chạy lại mỗi khi thêm/sửa tài liệu:
#   python tools/build-search/build.py
import html, json, re, unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('đ', 'd').replace('Đ', 'D').lower()

def text_of(page):
    # Một số trang giữ nội dung trong chuỗi JS: lấy các chuỗi trong <script>, bỏ mã lệnh
    strings = []
    for body in re.findall(r'<script\b[^>]*>(.*?)</script>', page, re.S | re.I):
        strings += [m[1] for m in re.findall(r'(["\'`])((?:\\.|(?!\1).)*)\1', body, re.S)]
    page = re.sub(r'<(script|style)\b.*?</\1>', ' ', page, flags=re.S | re.I)
    joined = page + ' ' + ' '.join(s for s in strings if re.search(r'[A-Za-zÀ-ỹ]{3}', s))
    return html.unescape(re.sub(r'<[^>]+>', ' ', joined))

catalog = json.loads((ROOT / 'data/pages.json').read_text(encoding='utf-8'))
out = {}
for rec in catalog['records']:
    if rec['category'] in ('icd10', 'tt20'):
        continue  # đã có dữ liệu riêng
    words = set(re.findall(r'[a-z0-9]{3,}', norm(text_of((ROOT / rec['file']).read_text(encoding='utf-8')))))
    out[rec['id']] = ' '.join(sorted(w for w in words if not w.isdigit()))

dest = ROOT / 'data/doc-text.json'
dest.write_text(json.dumps({'version': catalog['version'], 'updated': date.today().isoformat(), 'docs': out}, ensure_ascii=False), encoding='utf-8')
print(len(out), 'tai lieu,', dest.stat().st_size, 'byte')
