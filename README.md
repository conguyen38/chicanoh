# OneHousing - Công cụ ảnh căn

Ứng dụng web nội bộ để import danh sách căn, kéo các cột dữ liệu lên ảnh mẫu, chỉnh lớp chữ và xuất ảnh theo kích thước template.

## Chạy local

```bash
npm install
npm run dev
```

URL local mặc định: `http://127.0.0.1:5173/`

## Mã quản trị

Mã quản trị mẫu: `BDS-2026-7391`

Ứng dụng đang dùng SHA-256 hash trong `.env.example`:

```env
VITE_ADMIN_CODE_HASH=704e2322e3ad3b2c05b77a00ba673175f07e5769a4ba011c101044054a1960a3
```

Đổi mã quản trị bằng cách tạo hash SHA-256 mới và đặt vào file `.env`.

## Chức năng hiện có

- Tải ảnh mẫu lên.
- Import `.xlsx` hoặc `.csv`.
- Chọn mã căn theo cột khóa.
- Kéo hoặc bấm cột dữ liệu để tạo lớp chữ.
- Chỉnh phông chữ, cỡ chữ, màu, độ đậm, căn lề và độ rộng chữ.
- Tải phông chữ riêng `.woff`, `.woff2`, `.ttf`, `.otf`.
- Xuất PNG/JPG gốc hoặc 1/2.
- Preset khung ảnh: `4:5`, `1:1`, `9:16`, `16:9`.

## Biến môi trường để nối sau

```env
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_NEON_DATABASE_URL=
```

Hiện MVP lưu dữ liệu trên trình duyệt để chạy được ngay. Khi có key Cloudinary/Neon, nên chuyển ảnh mẫu, phông chữ và metadata dữ liệu sang API backend để dùng chung giữa nhiều máy.
