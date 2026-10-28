# Công cụ trích Thông tư 20/2022/TT-BYT

Dựng lại `data/tt20.json` (Phụ lục I và Phụ lục II) từ bản docx của Thông tư.

## Chạy lại

```
mkdir docx && cd docx && unzip ../20_2022_TT-BYT_548898.docx
perl tools/import-tt20/docx_tables.pl docx/word/document.xml > rows.jsonl
perl tools/import-tt20/tt20_build.pl rows.jsonl > data/tt20.json
```

Bước cuối in ra số dòng, STT lớn nhất và các lỗi cấu trúc. Lần chạy ngày 2026-10-28 cho kết quả: 1.133 dòng, STT 1–1.037 đủ, 0 lỗi.

## Quy tắc

- Bảng 3 trong docx là Phụ lục I, gồm 10 ô mỗi dòng: STT, tên, đường dùng, cột 4–7 (hạng), ghi chú và 2 ô trống. Dòng 4 hoặc 9 ô là tiêu đề nhóm (“1.”), phân nhóm (“1.1.”), hoặc tiểu mục không đánh số.
- Ô gộp dọc (`<w:vMerge />`) ở STT, tên và ghi chú được chép xuống các dòng đường dùng tiếp nối.
- Mục “lao kháng thuốc” nhắc lại Linezolid (255), Levofloxacin (234), Moxifloxacin (236) với STT gốc. Các dòng này được giữ nguyên, gắn `repeat`, và phải trùng tên với STT đã có.
- Bảng 4 là Phụ lục II, gồm 5 ô: STT, tên, đường dùng, dạng dùng, đơn vị. STT và tên có thể gộp dọc khi thuốc có nhiều đường dùng. Mỗi bản ghi có `annex` là “I” hoặc “II”; Phụ lục II có `tiers: []` (không phân hạng).
- `%SCAN_OVERRIDE`: hạng bệnh viện lấy theo bản gốc có chữ ký (scan) khi docx khác. Đã đối chiếu toàn bộ 1.133 dòng bằng tọa độ dấu “+” trong bản scan (PDF.js) và xem ảnh 18 dòng lệch do OCR. Chỉ STT 961 Omalizumab và 967 Tiotropium thật sự khác bản gốc. Script dừng nếu dữ liệu docx của 2 dòng này thay đổi.
