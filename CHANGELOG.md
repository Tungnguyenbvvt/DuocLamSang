# Nhật ký thay đổi

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
