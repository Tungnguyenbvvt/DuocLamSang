# Nhật ký thay đổi

## 1.7.0 – 2026-10-28

- **TT20: thêm Phụ lục II** – Danh mục thuốc phóng xạ và chất đánh dấu: 59 thuốc, 61 dòng đường dùng (Iode131 và Phospho 32 mỗi thuốc 2 đường dùng). Lấy nguyên văn tên, đường dùng, dạng dùng, đơn vị từ bản docx. **Đã so bằng mắt toàn bộ 61 dòng với ảnh bản gốc có chữ ký (trang 79–81): khớp hoàn toàn.**
- Phụ lục II không phân hạng bệnh viện; trang hiển thị “Không theo phân hạng bệnh viện” và chép nguyên văn quy định của Điều 2 vào phần chú giải. Thêm bộ lọc “Phụ lục” (I/II); STT Phụ lục II có nhãn “PL II”.
- `tt20.json` lên 1.1.0 (1.194 dòng; thêm trường `annex`, `form`, `unit`, `annexes`, `annexRules`). STT thống nhất dạng chuỗi. CACHE_VERSION lên cph-hub-v1.7.0. 31/31 ca kiểm thử đạt; điện thoại 375 px không cuộn ngang.
- Chưa nạp Phụ lục III (biểu mẫu thống kê dịch vụ kỹ thuật, không phải danh mục thuốc).

## 1.6.0 – 2026-10-28

- **TT20: nạp dữ liệu thật** Phụ lục I Thông tư 20/2022/TT-BYT ngày 31/12/2022 từ tệp 20_2022_TT-BYT_548898.docx do người dùng cung cấp: 1.037 thuốc (STT 1–1.037 đủ), 1.133 dòng đường dùng, 28 nhóm, 217 dòng có ghi chú điều kiện/tỷ lệ thanh toán. Chép nguyên văn; ô gộp dọc (cùng thuốc nhiều đường dùng) được chép xuống từng dòng. Giữ 3 dòng văn bản nhắc lại STT 255/234/236 trong mục lao kháng thuốc. Bỏ cờ `sample`.
- **Đối chiếu hạng bệnh viện với bản gốc có chữ ký (TT20.pdf, scan):** 1.131/1.133 dòng khớp (1.115 khớp tự động, 16 dòng OCR sót dấu “+” đã xem ảnh, xác nhận khớp). **2 dòng docx khác bản gốc:** STT 961 Omalizumab (docx c4,c5 – gốc chỉ hạng đặc biệt, I) và STT 967 Tiotropium (docx c4–c7 – gốc đến hạng III, IV). Theo chọn lựa của người dùng, lấy **theo bản gốc 2022**. Đã xem ảnh để đối chiếu thêm ghi chú COVID-19 của Anidulafungin (đúng nguyên văn).
- Trang TT20: hiện nhóm/phân nhóm dưới tên hoạt chất, 4 cột hạng (✓/✗ kèm chữ), ghi chú nhiều đoạn (thu gọn khi dài), chú giải nguyên văn Điều 2 về các cột hạng; lọc theo 28 nhóm và 4 hạng. Module tra cứu thêm điểm móc `onData`.
- Công cụ trích lưu ở `tools/import-tt20/`. 31/31 ca kiểm thử đạt. Điện thoại 375 px không cuộn ngang. CACHE_VERSION lên cph-hub-v1.6.0.
- Chưa nạp Phụ lục II (thuốc phóng xạ và chất đánh dấu, 61 dòng).

## 1.5.0 – 2026-10-28

- **ICD-10: nạp dữ liệu thật** từ Phụ lục Thông tư 06/2026/TT-BYT ngày 02/4/2026 (tệp ICD-10.pdf người dùng cung cấp, 1271 trang): 15.844 mã, 22 chương. Giữ nguyên văn tên bệnh tiếng Việt/tiếng Anh, hướng dẫn mã hóa bổ sung WHO 2019 (Việt/Anh) và 6 cờ cột 24–29 (không được dùng là bệnh chính, không khuyến khích dùng là bệnh chính, không dùng vì có mã chi tiết hơn, chỉ dùng mã hóa nguyên nhân tử vong, chỉ/chủ yếu ở nữ, chỉ/chủ yếu ở nam). Bỏ cờ `sample`. Lưu ý: nguồn văn bản là TT 06/2026/TT-BYT, không phải QĐ 4469 như ghi tạm trước đây.
- Trích bằng tọa độ chữ (PDF.js), công cụ lưu ở `tools/import-icd10/`. Kiểm tra tự động: STT liên tục 1–15.844, mã có/không dấu chấm khớp, không trùng mã, không thiếu tên, cờ trùng mã (trừ ký hiệu †/*). Đối chiếu tay với ảnh trang PDF: M90.6* (trang 712), C57.0 (trang 131), I09.2/I10 (trang 397–398). **Chưa có người thứ hai đối chiếu toàn bộ.**
- Module tra cứu: tìm mã không cần dấu chấm và bỏ qua †/*; xếp hạng mã đúng > mã bắt đầu bằng từ khóa > khớp tên > chỉ khớp phần hướng dẫn; không tô sáng từ khóa 1 ký tự khi có từ khóa khác; hướng dẫn dài được thu gọn, tự mở khi chứa từ khóa. Trang ICD-10 có thêm bộ lọc theo chương (tên chương nguyên văn) và theo lưu ý mã hóa.
- **TT20 chưa nạp**: tệp TT20.pdf là bản scan, lớp chữ OCR sai và mất dấu (ví dụ “U6ng”, “N atri thiosulfat”), nên không chép nguyên văn được. Riêng cột hạng bệnh viện (dấu +) thì đọc được chính xác theo tọa độ. Vẫn giữ dữ liệu MẪU.
- Ca kiểm thử: 31/31 đạt (thêm 10 ca: mã không dấu chấm, †/*, xếp hạng tên trước hướng dẫn, số trong từ khóa, lọc cờ, tô sáng 1 ký tự). Tìm trên 15.844 dòng mất 3–8 ms. Điện thoại 375 px không cuộn ngang. Bộ nhớ offline có icd10.json (CACHE_VERSION cph-hub-v1.5.0).

## 1.4.0 – 2026-10-28

- Thêm 2 module: **ICD-10** (dải xanh lá #3fae5a) và **TT20 – Danh mục thuốc BHYT** (dải cam #e8743b), mỗi module một trang công cụ tra cứu.
- Module tra cứu dùng chung `js/modules/lookup.js`: tìm không dấu nhiều từ khóa (AND), ưu tiên khớp đúng mã rồi mã bắt đầu bằng từ khóa, lọc theo chương / nhóm thuốc / hạng bệnh viện, tô sáng, phân trang 100 dòng, dạng thẻ trên điện thoại (≤ 760 px).
- Dữ liệu `data/icd10.json`, `data/tt20.json` mới là **dòng MẪU** (`sample: true`, banner cảnh báo đỏ). Nguồn trích là nguồn dự kiến, **chưa kiểm chứng**; chưa nạp dữ liệu thật.
- Danh mục `pages.json` lên 1.1.0 (26 bản ghi); CACHE_VERSION lên cph-hub-v1.4.0 (thêm data, css, js mới vào bộ nhớ offline).

Kiểm tra đã chạy (trình duyệt tích hợp, localhost:8080):
- `tests/lookup.test.html`: 21/21 ca đạt (bỏ dấu, chuỗi rỗng/khoảng trắng, khớp đúng mã, mã có dấu chấm, AND, lọc trường đơn/mảng, lọc + tìm, thoát HTML, validate thiếu trường/sai định dạng ngày).
- Cú pháp `core.js`, `sw.js`, `lookup.js`, script nhúng 2 trang: đạt. JSON 4 tệp hợp lệ. Không trùng id. 26/26 tệp tải HTTP 200.
- Tương tác: lọc hạng II, lọc chương, tìm mã, kết quả rỗng. Điện thoại 375 px không cuộn ngang. Bộ nhớ offline có đủ 6 tệp mới.

## 1.3.0 – 2026-10-27

- Tiêu đề 4 module lớn trong sidebar đổi sang dải màu đặc, mỗi module một màu nhận diện: Guideline vàng #f2b84b, Thông tin thuốc hồng #f37fae, So sánh dược lý xanh #5fd4e8, EBM tím #b3a6ff; biểu tượng đặt trên ô trắng. Người dùng chọn phương án B trong 3 phương án (A thẻ nổi, B dải màu, C biểu tượng khối lớn).
- Tăng CACHE_VERSION lên cph-hub-v1.3.0.
- Kiểm tra: desktop và điện thoại 375 px, không cuộn ngang, không tài nguyên lỗi.

## 1.2.0 – 2026-10-27

- Đổi giao diện theo ảnh mẫu: sidebar nền xanh két #045050, mục đang chọn #0f706e, chữ trắng, chữ phụ #bfe0de; màu nhấn chuyển từ #007db3 sang #0f706e (trang chủ, thẻ, bộ lọc).
- Dòng phụ rút gọn thành "DSCKI Nguyễn Quý Tùng" (sidebar, meta author, manifest).
- Logo BVĐK Vũ Thư đặt trên nền tròn trắng để nổi trên nền tối.
- Tăng CACHE_VERSION lên cph-hub-v1.2.0.
- Kiểm tra: desktop và điện thoại 375 px trên localhost:8080, không cuộn ngang, không lỗi console của ứng dụng.

## 1.1.0 – 2026-10-27

- Đổi tên ứng dụng thành "DượcLâmSàng BVĐKVũThư", dòng phụ "DSCKI Nguyễn Quý Tùng - Phòng KHTH".
- Thay logo bằng logo BVĐK Vũ Thư (sidebar, favicon, icon cài đặt 192/512/maskable); màu nhấn #007db3 lấy từ logo.
- Bỏ ô chọn đơn vị Phương Nam/Phương Châu (ứng dụng nay dùng riêng cho BVĐK Vũ Thư).
- Tăng CACHE_VERSION lên cph-hub-v1.1.0 để người dùng nhận logo mới.

## 1.0.0 – 2026-10-27

- Dựng cổng tích hợp có sidebar trái cho 24 tài liệu (chuyển vào `pages/`, không sửa nội dung).
- Đổi tên `Guideline đái tháo đường 2023 2026.html` → `pages/guideline-dai-thao-duong-2023-2026.html`.
- PWA: service worker network-first cho tệp nội bộ, lưu đệm font/CDN để dùng ngoại tuyến.
- Không có công thức tính toán lâm sàng trong phiên bản này → không áp dụng ca kiểm thử công thức.

Kiểm tra đã chạy (trình duyệt tích hợp, localhost:8080):
- Cú pháp `js/core.js`, `sw.js` (biên dịch `new Function`): đạt. JSON `pages.json`, `manifest.webmanifest`: hợp lệ. Không trùng id trong `index.html`.
- 24/24 tệp tài liệu trả HTTP 200; schema danh mục đủ `version`, `updated`, `source`, `records`; mọi `category` hợp lệ.
- Tìm kiếm không dấu ("duong", "khang sinh gram"), tô sáng, kết quả rỗng; mở tài liệu, yêu thích, gần đây, lọc nhóm/chuyên khoa, đổi đơn vị, id sai quay về trang chủ.
- Điện thoại 375 px: ngăn kéo menu, Enter mở tài liệu, không cuộn ngang. Desktop: thu gọn sidebar.
- Ngoại tuyến: dừng máy chủ, tải lại – hub và tài liệu vẫn mở từ bộ nhớ đệm (35 mục).
