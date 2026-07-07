# OneHousing - Công cụ ảnh căn

Ứng dụng web nội bộ để import danh sách căn, kéo các cột dữ liệu lên ảnh mẫu, chỉnh lớp chữ và xuất ảnh theo kích thước template.

## Chạy local

```bash
npm install
npm run dev
```

URL local mặc định: `http://127.0.0.1:5173/`

## Mã quản trị

Mã quản trị mẫu: `admin`

Ứng dụng đang dùng SHA-256 hash trong `.env.example`:

```env
VITE_ADMIN_CODE_HASH=replace-with-sha256-password-hash
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

## Production với Vercel, Neon và Cloudinary

```env
ADMIN_ACCOUNT=admin
SESSION_SECRET=change-this-to-a-long-random-string
NEON_DATABASE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=onehousing-property-maker
```

Khi deploy lên Vercel, app sẽ dùng `/api/state` để lưu state vào Neon và `/api/cloudinary/sign` để ký upload ảnh/font lên Cloudinary. Nếu các API chưa được cấu hình, app tự fallback về lưu trên trình duyệt như bản MVP.

Không đặt database URL dưới dạng `VITE_*` vì biến `VITE_*` sẽ bị đóng gói ra phía trình duyệt.

Thiết lập Vercel:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: thêm toàn bộ biến production ở trên
- Nếu muốn đặt mật khẩu admin qua biến môi trường, thêm biến `ADMIN_PASSWORD_HASH` trong Vercel với giá trị SHA-256 của mật khẩu.
