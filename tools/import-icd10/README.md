# Công cụ trích ICD-10 từ PDF

Dựng lại `data/icd10.json` từ Phụ lục Thông tư 06/2026/TT-BYT (PDF số, bảng 29 cột, 1271 trang).

## Cách làm

PDF.js đọc tọa độ (x, y) của từng mảnh chữ. Bảng xuất từ bảng tính nên mỗi cột nằm ở một vị trí x cố định trên mọi trang. `parse.js`:

1. Neo mỗi dòng của bảng theo mục ở cột 18 “Mã bệnh” (x ≈ 473).
2. Gán mảnh chữ vào dòng có y ≥ y_mục − 0,3 điểm. Chữ tràn từ ô dòng trên lệch từ 0,5 điểm trở lên, nên không bị gán nhầm.
3. Gán vào cột theo x. Trong một dòng, các mảnh liền nhau (khe < 0,8 điểm) được nối thẳng.
4. Các dòng xuống dòng trong ô được nối bằng 1 dấu cách. Nối liền khi gặp từ ghép có gạch nối, khoảng mã bị ngắt (“I60-” + “I69”), hoặc từ dài bị ngắt giữa chừng (dòng trước là 1 cụm và không còn chỗ cho ký tự kế tiếp). Ngoại lệ đã rà tay nằm trong `KEEP_SPACE`.
5. Kiểm tra: STT liên tục, mã có/không dấu chấm khớp nhau, định dạng mã (cho phép †/*), không thiếu tên, giá trị cột cờ trùng với mã.

## Chạy lại

1. Chép tệp PDF vào thư mục này, đặt tên `ICD-10.pdf`.
2. Chạy máy chủ: `powershell -ExecutionPolicy Bypass -File tools\import-icd10\serve.ps1`, rồi mở http://localhost:8091/extract.html.
3. Trong console của trình duyệt: `await run('ICD-10.pdf', 'icd_1-320.json', 1, 320)` (chạy lần lượt các đoạn trang). Chép các tệp trong `out/` vào `dump/`. Sau đó gọi `ICDParse.finalize(ICDParse.parse(pages))` và lưu kết quả bằng `save('icd10.json', …)`.
4. Rà `problems`, `glued` và `overlaps` trong kết quả. Đối chiếu ngẫu nhiên vài dòng với trang PDF bằng `show('ICD-10.pdf', trang, yTrên, yDưới, 465, 842)`.

Kết quả lần chạy 2026-10-28: 15.844 dòng (khớp STT 1–15.844), 22 chương, 0 lỗi cấu trúc. Đã đối chiếu tay các mã M90.6*, C57.0 và I09.2/I10.
