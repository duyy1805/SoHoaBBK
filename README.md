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
- _Lưu ý_: Cấu hình `baseURL` trong `src/api/axiosClient.js` trỏ về IP nội bộ của máy tính chạy Server.

---

## 👥 Vai trò & Phân quyền (Roles & Permissions)

Hệ thống vận hành dựa trên các mã quyền cụ thể cho từng bộ phận:

| Vai trò               | Mã quyền chính         | Chức năng chính                                                    | App sử dụng  |
| :-------------------- | :--------------------- | :----------------------------------------------------------------- | :----------- |
| **Tổ trưởng KCS**     | `PHAN_BO_KIEM`         | Tạo phiếu, phân công người kiểm, cấu hình bậc kiểm tra.            | Web / Mobile |
| **Nhân viên KCS**     | `THUC_HIEN_KIEM`       | Thực hiện lấy mẫu, nhập số lượng lỗi, tính AQL, hoàn tất kiểm tra. | Mobile       |
| **Quản đốc PX**       | `XAC_NHAN_PX`          | Xác nhận kết quả kiểm tra từ phía phân xưởng sản xuất.             | Mobile / Web |
| **Phòng Kiểm nghiệm** | `XAC_NHAN_KIEM_NGHIEM` | Xác nhận các chỉ số kỹ thuật chuyên sâu.                           | Web          |
| **Quản trị viên**     | `QUAN_TRI_DM`          | Quản lý danh mục Sản phẩm, Loại lỗi, Định mức kiểm tra.            | Web          |

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

---

## 📱 KCS Mobile - Nghiệp vụ luồng phiếu kiểm

Phần này tổng hợp trực tiếp từ `kcs-mobile/README.md` để agent có thể đọc một file là nắm được luồng mobile khi sửa code.

### 1) Điểm vào và phân loại phiếu

- Danh sách phiếu lấy từ API `GET /phieu-kiem/my` (xem `src/api/phieuKiem.api.js` + `src/screens/PhieuListScreen.js`).
- Khi bấm vào 1 phiếu:
  - Nếu `LoaiKiemId === 4`: đi vào màn `SxbtInspectionScreen` (phiếu sản xuất bổ trợ).
  - Các loại còn lại: đi vào `PhieuDetailScreen` (dùng chung cho đầu vào/kiểm cuối và các loại kiểm chuẩn).

### 2) Trạng thái chính của phiếu

Các trạng thái xuất hiện trong app:

- `TAO_MOI`: vừa tạo, chưa thiết lập section.
- `DA_TAO_SECTION`: đã tạo section kiểm, chưa xác nhận kết quả cuối.
- `DANG_KIEM`: đang thực hiện kiểm.
- `CHO_XUONG_XAC_NHAN`: chờ xác nhận phía xưởng/kho.
- `CHO_KIEM_NGHIEM`: chờ xác nhận kiểm nghiệm.
- `HOAN_TAT`: hoàn tất.
- Với phiếu SXBT còn thấy `HOAN_THANH` ở lớp UI, được xem là trạng thái đã khóa sửa.

### 3) Phân quyền thao tác

Quyền được đọc từ `user.permissions`:

- `THUC_HIEN_KIEM`: KCS trực tiếp kiểm và hoàn tất bước kiểm.
- `PHAN_BO_KIEM`: leader có thể thao tác như KCS ở luồng section.
- `XAC_NHAN_PX`: xác nhận bước xưởng/kho.
- `XAC_NHAN_KIEM_NGHIEM`: xác nhận bước kiểm nghiệm cuối.

### 4) Luồng phiếu đầu vào (incoming)

Phiếu đầu vào đang dùng luồng chung `PhieuDetailScreen`:

1. Mở chi tiết phiếu: `GET /phieu-kiem/:id`.
2. Nếu phiếu đang `TAO_MOI` và user có quyền KCS/leader:
   - Thiết lập nhóm kiểm qua modal `SectionConfigModal`.
   - API tạo section: `POST /phieu-kiem/section`.
3. Nhập/Xác nhận LOT:
   - API: `POST /phieu-kiem/update-lot`.
4. Thực hiện kiểm từng mục trong từng section:
   - Vào màn `CheckItemScreen`.
   - Lưu kết quả mục kiểm: `POST /phieu-kiem/check-item`.
   - Nếu có ảnh lỗi: upload trước qua `POST /phieu-kiem/upload`.
5. Chốt AQL từng section:
   - API: `POST /phieu-kiem/calculate-aql`.
   - Section sẽ có `KetLuan` (`ACCEPT`/`REJECT`).
6. Hoàn tất bước kiểm KCS:
   - Điều kiện UI: tất cả section đã có kết luận.
   - API: `POST /phieu-kiem/complete`.
   - Kết luận tổng sẽ suy ra từ section reject (và phần kiểm đặc biệt nếu có).
7. Xác nhận PX:
   - Trạng thái `CHO_XUONG_XAC_NHAN`.
   - API: `POST /phieu-kiem/xac-nhan-px`.
8. Xác nhận kiểm nghiệm:
   - Trạng thái `CHO_KIEM_NGHIEM`.
   - API: `POST /phieu-kiem/xac-nhan-kiem-nghiem`.
9. Kết thúc: `HOAN_TAT`.

### 5) Luồng phiếu kiểm cuối (final inspection)

Hiện tại kiểm cuối cũng chạy trên `PhieuDetailScreen` + `CheckItemScreen`, khác ở dữ liệu hiển thị và nghiệp vụ sản phẩm đầu ra:

1. Mở chi tiết: `GET /phieu-kiem/:id`.
2. Với phiếu có `LoaiKiemId === 5`, UI hiển thị thêm trường `Nơi đến (DoiTuong)`.
3. Các bước vận hành giống luồng đầu vào:
   - Thiết lập section (nếu `TAO_MOI`).
   - Xác nhận LOT.
   - Kiểm từng check item, ghi lỗi/ảnh, chốt AQL từng section.
   - `complete` -> `xac-nhan-px` -> `xac-nhan-kiem-nghiem`.
4. Nếu phát sinh KPH, phiếu có thể liên kết `BienBanId` và cho mở sang màn biên bản.

Lưu ý: app không tách riêng API riêng cho kiểm cuối, đang đi chung bộ API `phieu-kiem/*`.

### 6) Luồng phiếu sản xuất bổ trợ (SXBT)

SXBT là luồng riêng tại `SxbtInspectionScreen` (khi `LoaiKiemId === 4`):

1. Tải dữ liệu ban đầu (song song):
   - `GET /phieu-kiem/:id` lấy thông tin phiếu + dữ liệu đã lưu.
   - `GET /lookup/defect-list` lấy master lỗi.
   - đọc user để xác định quyền.
2. Màn hình SXBT gồm 4 khối dữ liệu:
   - I. Điều kiện vận chuyển (`DKVC_THUNG_SAN_XE`, `DKVC_NGOAI_QUAN`).
   - II. Chi tiết BTP (danh sách item và thông tin như GS1, LOT, số bó...).
   - III. Tỷ lệ kiểm (loại mẫu, số lượng mẫu, tỷ lệ đạt/lỗi, kết luận phiếu).
   - IV. Ghi nhận lỗi (số lượng lỗi, cờ lặp lại).
3. Lưu tạm dữ liệu:
   - API `POST /phieu-kiem/sxbt-save`.
   - Payload gồm `dynamicFields`, `btpItems`, `summary`, `defects`, `ketLuan`.
4. Hoàn tất SXBT:
   - Bước 1: gọi `sxbt-save` để chốt dữ liệu mới nhất.
   - Bước 2: gọi `POST /phieu-kiem/sxbt-complete` với `ketLuan` để chuyển trạng thái.
5. Xác nhận sau hoàn tất:
   - Trạng thái `CHO_XUONG_XAC_NHAN`: user quyền `XAC_NHAN_PX` gọi `POST /phieu-kiem/xac-nhan-px`.
   - Trạng thái `CHO_KIEM_NGHIEM`: user quyền `XAC_NHAN_KIEM_NGHIEM` gọi `POST /phieu-kiem/xac-nhan-kiem-nghiem`.
6. Trạng thái đã khóa sửa trong UI SXBT:
   - `CHO_XUONG_XAC_NHAN`, `CHO_KIEM_NGHIEM`, `HOAN_THANH`, `HOAN_TAT`.

### 7) Luồng kiểm đặc biệt (áp dụng bổ sung)

Trong `PhieuDetailScreen`, nếu API trả về danh sách thông số đặc biệt (`thongSo`) thì xuất hiện nút vào màn `KiemDacBietScreen`:

1. Tải dữ liệu: `GET /phieu-kiem/:id/thong-so-kq`.
2. Nhập kết quả đo theo ma trận thông số x mẫu.
3. Lưu: `POST /phieu-kiem/:id/thong-so-kq`.
4. Kết quả đặc biệt được dùng khi tính kết luận tổng ở màn chi tiết:
   - Có mẫu ngoài dung sai => đánh dấu ảnh hưởng tới kết luận cuối (`KHONG_DAT`).

### 8) Ghi chú mapping nghiệp vụ

- Mapping chắc chắn trong code:
  - `LoaiKiemId === 4` => SXBT.
  - `LoaiKiemId === 5` => có hiển thị `Nơi đến`, đang được dùng cho nhóm phiếu đầu ra/kiểm cuối.
- App chưa có nhánh route riêng cho “đầu vào” và “kiểm cuối”; hai loại này hiện dùng chung luồng `PhieuDetailScreen`.
- Nếu backend thay đổi enum trạng thái hoặc mapping `LoaiKiemId`, cần cập nhật tài liệu này đồng bộ với UI.
