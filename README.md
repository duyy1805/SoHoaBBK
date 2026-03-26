# Hệ Thống Số Hóa KCS - SoHoaBBK

Dự án **SoHoaBBK** là giải pháp chuyển đổi số quy trình kiểm tra chất lượng (KCS), giúp quản lý phiếu kiểm tra, biên bản sự cố và danh mục sản phẩm tập trung trên nền tảng Web và Mobile.

---

## 🏗 Cấu trúc dự án

Dự án bao gồm 3 thành phần chính:

1.  **Backend (`/server`)**: 
    - Node.js Express, kết nối SQL Server thông qua Stored Procedures.
    - Quản lý xác thực JWT và phân quyền dựa trên mã quyền (Permission Codes).
2.  **Web Admin (`/sohoa-bbk-web`)**:
    - React 19, Vite, MUI v7.
    - Dành cho cấp quản lý: Quản trị danh mục, xem báo cáo, in ấn phiếu kiểm/biên bản và cấu hình hệ thống.
3.  **App Mobile (`/kcs-mobile`)**:
    - React Native (Expo), React Native Paper.
    - Dành cho nhân viên hiện trường: Thực hiện kiểm tra, nhập lỗi, chụp ảnh và xác nhận kết quả trực tiếp tại dây chuyền.

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Backend
- Yêu cầu: Node.js v18+, SQL Server.
- Cài đặt: `cd server && npm install`
- Cấu hình: Tạo file `.env` với các biến `PORT`, `JWT_SECRET`, `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`.
- Chạy: `npm run server`

### 2. Web Frontend
- Cài đặt: `cd sohoa-bbk-web && npm install`
- Chạy: `npm run dev`
- Truy cập: `http://localhost:5173`

### 3. Mobile App
- Cài đặt: `cd kcs-mobile && npm install`
- Chạy: `npx expo start`
- *Lưu ý*: Cấu hình `baseURL` trong `src/api/axiosClient.js` trỏ về IP nội bộ của máy tính chạy Server.

---

## 👥 Vai trò & Phân quyền (Roles & Permissions)

Hệ thống vận hành dựa trên các mã quyền cụ thể cho từng bộ phận:

| Vai trò | Mã quyền chính | Chức năng chính | App sử dụng |
| :--- | :--- | :--- | :--- |
| **Tổ trưởng KCS** | `PHAN_BO_KIEM` | Tạo phiếu, phân công người kiểm, cấu hình bậc kiểm tra. | Web / Mobile |
| **Nhân viên KCS** | `THUC_HIEN_KIEM` | Thực hiện lấy mẫu, nhập số lượng lỗi, tính AQL, hoàn tất kiểm tra. | Mobile |
| **Quản đốc PX** | `XAC_NHAN_PX` | Xác nhận kết quả kiểm tra từ phía phân xưởng sản xuất. | Mobile / Web |
| **Phòng Kiểm nghiệm** | `XAC_NHAN_KIEM_NGHIEM` | Xác nhận các chỉ số kỹ thuật chuyên sâu. | Web |
| **Quản trị viên** | `QUAN_TRI_DM` | Quản lý danh mục Sản phẩm, Loại lỗi, Định mức kiểm tra. | Web |

---

## 🔄 Luồng hoạt động chính (Workflow)

### 1. Quy trình Kiểm tra (Phieu Kiem)
1.  **Khởi tạo**: Tổ trưởng KCS tạo phiếu từ Lịch đóng cont hoặc Chứng từ nhập. Phân công Nhân viên KCS thực hiện.
2.  **Thực hiện**: Nhân viên KCS nhận phiếu trên Mobile, tiến hành kiểm tra theo từng mục (Check Items). Nếu có lỗi, nhập số lượng lỗi theo mã lỗi tương ứng.
3.  **Đánh giá**: Hệ thống tự động tính toán kết quả AQL (Chấp nhận/Loại bỏ) dựa trên số lỗi đã nhập và bậc kiểm tra.
4.  **Xác nhận đa tầng**:
    - **KCS** hoàn tất phiếu.
    - **Quản đốc PX** kiểm tra và bấm xác nhận trên App.
    - **Phòng Kiểm nghiệm** xác nhận (nếu loại hình kiểm yêu cầu).
5.  **Kết luận & In ấn**: Quản lý đưa ra kết luận cuối cùng và in phiếu PDF từ Web để lưu hồ sơ.

### 2. Quy trình Biên bản sự cố (Bien Ban)
1.  Khi có sự cố nghiêm trọng, KCS tạo Biên bản từ Phiếu kiểm.
2.  Ghi nhận nguyên nhân, phân loại lỗi và gán trách nhiệm cho các cá nhân/bộ phận liên quan.
3.  Đề xuất hành động khắc phục và theo dõi tiến độ xử lý.

---

## 🛠 Quản trị Danh mục (DanhMuc)
Dành cho vai trò Quản trị viên trên Web:
- **Sản phẩm**: Quản lý thông số sản phẩm, quy cách đóng gói.
- **Nhóm kiểm**: Định nghĩa các nhóm chỉ tiêu (Ngoại quan, Kích thước, Đóng gói...).
- **Mục kiểm tra**: Chi tiết các tiêu chí cần kiểm tra trong mỗi nhóm.
- **Mã lỗi**: Hệ thống hóa các loại lỗi để thống kê tỷ lệ lỗi (Defect Rate).

---

## 📝 Lưu ý phát triển
- Toàn bộ logic nghiệp vụ phức tạp được đóng gói trong **Stored Procedures** tại database.
- Sử dụng **axiosClient** chung để xử lý tự động gắn Token JWT vào header mỗi request.
- Các hằng số về màu sắc, font chữ được quản lý trong `src/theme/theme.js` của cả Web và Mobile.
