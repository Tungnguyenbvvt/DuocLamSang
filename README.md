# DượcLâmSàng BVĐKVũThư – Cổng tra cứu dược lâm sàng

DSCKI Nguyễn Quý Tùng, Bệnh viện Đa khoa Vũ Thư.

Web app tĩnh (PWA, chạy ngoại tuyến) gom các tài liệu dược lâm sàng vào một giao diện có **thanh điều hướng bên trái**:

- Tóm tắt guideline (10)
- Tài liệu thông tin thuốc (7)
- So sánh dược lý lâm sàng (5)
- Thẩm định bài báo – EBM (2)
- ICD-10 – công cụ tra cứu 15.844 mã bệnh theo Phụ lục Thông tư 06/2026/TT-BYT (trích từ PDF, công cụ trích ở `tools/import-icd10/`)
- TT20 – công cụ tra cứu thuốc BHYT theo Thông tư 20/2022/TT-BYT: Phụ lục I (1.037 thuốc) và Phụ lục II (59 thuốc phóng xạ, chất đánh dấu) (hạng bệnh viện đã đối chiếu bản gốc; công cụ trích ở `tools/import-tt20/`)

## Cấu trúc

```
index.html              Khung ứng dụng (sidebar + khung xem tài liệu)
css/base.css            Lõi design system ClinPharmAI
css/theme.css           Màu theo đơn vị (BVĐK Vũ Thư: sidebar #045050, nhấn #0f706e)
icons/                  Logo BVĐK Vũ Thư, favicon, icon cài đặt (192, 512, maskable)
js/core.js              Điều hướng, tìm kiếm không dấu, yêu thích, định tuyến #/p/<id>
data/pages.json         Danh mục tài liệu (version, updated, source, records)
data/icd10.json         Dữ liệu tra cứu ICD-10 (15.844 mã, TT 06/2026/TT-BYT)
data/tt20.json          Dữ liệu tra cứu Thông tư 20/2022/TT-BYT, Phụ lục I + II (1.194 dòng)
js/modules/lookup.js    Module tra cứu dùng chung (tìm không dấu, lọc, bảng/thẻ)
css/tool.css            Giao diện trang tra cứu
pages/*.html            Tài liệu gốc – giữ nguyên nội dung; tra-cuu-*.html là trang công cụ
tests/lookup.test.html  Ca kiểm thử hàm tìm kiếm – mở qua localhost để chạy
sw.js                   Service worker: lưu toàn bộ để dùng ngoại tuyến
manifest.webmanifest    Cài đặt lên màn hình chính điện thoại
tools/serve.ps1         Máy chủ cục bộ để xem thử (không cần Node/Python)
```

## Xem thử trên máy

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```
Mở http://localhost:8080. Không mở trực tiếp `index.html` bằng đúp chuột: trình duyệt chặn đọc `data/pages.json` qua `file://`.

## Thêm tài liệu mới

1. Chép tệp HTML vào `pages/` (tên không dấu, không dấu cách).
2. Thêm một bản ghi vào `data/pages.json` (`id` duy nhất, `title`, `file`, `category`, `tags`, `review`), cập nhật `version` và `updated`.
3. Tăng `CACHE_VERSION` trong `sw.js`.

## Nạp dữ liệu thật cho ICD-10 / TT20

1. Chép nguyên văn từ văn bản gốc của Bộ Y tế vào `records` của `data/icd10.json` hoặc `data/tt20.json`, giữ đúng tên trường (xem khối `fields` trong tệp).
2. Bỏ dòng `"sample": true` (banner “DỮ LIỆU MẪU” sẽ tự ẩn), cập nhật `version`, `updated`, và `source` theo kiểu Vancouver đã đối chiếu.
3. Đổi `review` của bản ghi tương ứng trong `data/pages.json`, tăng `CACHE_VERSION` trong `sw.js`, chạy `tests/lookup.test.html`.
4. Nhờ một dược sĩ hoặc bác sĩ khác đối chiếu ngẫu nhiên một số dòng với văn bản gốc trước khi dùng.

## Phím tắt

- `/` – tìm tài liệu; `Enter` mở kết quả đầu; `↑ ↓` di chuyển trong sidebar; `Esc` xóa tìm kiếm / đóng menu.

## Dữ liệu và an toàn

- Không thu thập dữ liệu bệnh nhân. `localStorage` chỉ lưu tùy chọn giao diện và id tài liệu yêu thích/đã xem.
- Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP; đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.
- Tất cả tài liệu đang gắn nhãn **“chưa kiểm chứng”**: cần dược sĩ hoặc bác sĩ khác đối chiếu nguồn trước khi áp dụng trên người bệnh. Đổi nhãn trong `data/pages.json` sau khi đã thẩm định.

## Triển khai GitHub Pages

Settings → Pages → Source: `Deploy from a branch`, nhánh `main`, thư mục `/ (root)`.
