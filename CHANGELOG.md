# Nhật ký thay đổi

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
