# AGENT.md - Ngữ Cảnh Nghiệp Vụ Dự Án SoHoaBBK

Tài liệu này là điểm đọc đầu tiên cho Codex/agent khi làm việc trong repo SoHoaBBK. Mục tiêu là nắm nhanh nghiệp vụ hiện có, luồng dữ liệu, vai trò, trạng thái và quy ước sửa code mà không phải suy đoán từ đầu.

## 1. Tổng Quan Hệ Thống

SoHoaBBK là hệ thống số hóa quy trình KCS, quản lý phiếu kiểm tra chất lượng, biên bản không phù hợp/sự cố, danh mục kiểm tra và dữ liệu xác nhận trên Web và Mobile.

Repo gồm 3 phần chính:

- `server/`: Backend Node.js Express, kết nối SQL Server, đa số nghiệp vụ nằm trong stored procedure.
- `sohoa-bbk-web/`: Web Admin React/Vite/MUI cho quản lý, tạo phiếu, xem chi tiết, danh mục, biên bản và in ấn.
- `kcs-mobile/`: App Expo/React Native cho KCS hiện trường, PX/Kho, kiểm nghiệm và người xử lý biên bản.

Các tuyến API chính được mount trong `server/index.js`:

- `/api/auth`: đăng nhập, đăng ký, push token.
- `/api/hr`: lấy lịch đóng cont ESAM.
- `/api/phieu-kiem`: phiếu kiểm, section, check item, AQL, xác nhận, SXBT, kiểm đặc biệt.
- `/api/bien-ban`: biên bản thường.
- `/api/bien-ban-sxbt`: biên bản SXBT.
- `/api/lookup`: danh mục và lookup.
- `/api/notifications`: thông báo.

## 2. Tech Stack Và Lệnh Chạy

Backend `server/`:

- Node.js, Express, CommonJS.
- SQL Server qua `mssql`.
- JWT xác thực, mật khẩu hiện so sánh MD5 trong route login/register.
- Upload ảnh qua `multer`, xử lý ảnh qua `sharp`.
- Push notification qua `expo-server-sdk`.
- Lệnh chạy: `cd server && npm run server`.
- Import lỗi SXBT: `cd server && npm run import:sxbt-defects`.

Web `sohoa-bbk-web/`:

- React 19, Vite, Material UI v7, React Router.
- Lệnh chạy dev: `cd sohoa-bbk-web && npm run dev`.
- Build: `cd sohoa-bbk-web && npm run build`.
- Lint: `cd sohoa-bbk-web && npm run lint`.

Mobile `kcs-mobile/`:

- Expo, React Native, React Navigation, React Native Paper.
- Lệnh chạy: `cd kcs-mobile && npm start` hoặc `npx expo start`.
- Native: `npm run android`, `npm run ios`.
- Khi dựng UI mobile:
  - Màn chính có header navigator sẵn thường chỉ nên dùng `SafeAreaView edges={["bottom"]}` cho phần content để tránh khoảng trắng thừa phía trên.
  - `Modal` hoặc màn full-screen có header tự dựng bên trong phải dùng `SafeAreaView edges={["top","bottom"]}` để header không bị đẩy lên sát status bar/Dynamic Island.

## 3. Quy Ước API, Auth Và Data Access

- Web và Mobile đều dùng `src/api/axiosClient.js` để gắn `Authorization: Bearer <token>`.
- Khi gặp `401`, Web xóa token và redirect `/login`; Mobile logout, hiện toast và reset navigation về `Login`.
- Base URL hiện trỏ production `https://z76api.z76.vn/api`; khi dev local có comment `http://localhost:5001/api`.
- Ảnh upload phiếu kiểm được trả về path dạng `/uploads/...`; khi hiển thị cần ghép host API nếu path chưa phải URL tuyệt đối.
- Backend nên gọi stored procedure bằng `pool.request().execute('sp_Name')` cho nghiệp vụ chính. Không tự thêm SQL phức tạp trong route nếu nghiệp vụ đó thuộc database/stored procedure.
- Các thay đổi API nên kiểm tra cả Web và Mobile vì nhiều endpoint dùng chung.
- Không đổi tên enum trạng thái, permission code, field API hoặc mapping `LoaiKiemId` nếu không cập nhật đồng bộ cả backend, web, mobile và stored procedure.

## 4. Vai Trò Và Permission Chính

Hệ thống dựa trên JWT chứa `roles` và `permissions`. Các permission quan trọng:

- `XEM_PHIEU_KIEM`: xem danh sách/nguồn phiếu kiểm.
- `PHAN_BO_KIEM`: tổ trưởng/leader KCS, tạo phiếu, phân công người kiểm, tạo section.
- `THUC_HIEN_KIEM`: nhân viên KCS thực hiện kiểm, nhập kết quả, upload ảnh, hoàn tất bước kiểm.
- `XAC_NHAN_PX`: trưởng bộ phận/PX xác nhận sau khi KCS hoàn tất phiếu thường.
- `XAC_NHAN_KIEM_NGHIEM`: quyền cũ, không còn dùng trong luồng phiếu kiểm thường.
- `KET_LUAN`: người có quyền kết luận/hoàn tất biên bản hoặc một số bước quản lý chất lượng.
- `QUAN_TRI_DM`: quản trị danh mục.
- `XAC_NHAN_NGUOI_XU_LY`: phân công/xác nhận người xử lý biên bản.

Khi sửa UI thao tác, phải kiểm tra điều kiện permission hiện có trong cả Web và Mobile để tránh mở sai nút nghiệp vụ.

## 5. Trạng Thái Phiếu Kiểm

Các trạng thái chính đang xuất hiện trong Web/Mobile:

- `TAO_MOI`: phiếu vừa tạo, chưa tạo section kiểm.
- `DA_TAO_SECTION`: đã tạo section/checklist, có thể thực hiện kiểm.
- `DANG_KIEM`: đang kiểm.
- `CHO_XUONG_XAC_NHAN`: đã hoàn tất bước KCS, chờ trưởng bộ phận/PX xác nhận.
- `CHO_KIEM_NGHIEM`: trạng thái legacy; dữ liệu cũ nên được chuyển về `CHO_XUONG_XAC_NHAN`.
- `HOAN_TAT`: phiếu hoàn tất.
- `HOAN_THANH`: xuất hiện ở UI SXBT như trạng thái đã khóa sửa, cần xem như đã hoàn tất/không cho chỉnh.

Các kết luận thường gặp:

- Section/AQL: `ACCEPT`, `REJECT`.
- Phiếu hoặc kiểm đặc biệt: có thể dùng các nhãn đạt/không đạt tùy stored procedure và UI.

## 6. Luồng Phiếu Kiểm Thường

Luồng chung cho phiếu không phải SXBT, hiện dùng màn `PhieuKiemDetail` trên Web và Mobile.

1. Tạo phiếu trên Web tại `/phieu-kiem/create`.
2. Người tạo chọn loại kiểm, nguồn dữ liệu và người kiểm.
3. Backend tạo phiếu qua `POST /phieu-kiem/create`.
4. Chi tiết phiếu lấy qua `GET /phieu-kiem/:id`.
5. Nếu trạng thái `TAO_MOI`, user có `PHAN_BO_KIEM` tạo section/checklist qua `POST /phieu-kiem/section`.
6. KCS/leader nhập hoặc xác nhận LOT qua `POST /phieu-kiem/update-lot` nếu luồng yêu cầu.
7. KCS mở từng check item, nhập kết quả, lỗi, số lượng lỗi và ảnh.
8. Ảnh lỗi upload trước qua `POST /phieu-kiem/upload`, sau đó lưu path ảnh cùng kết quả check item.
9. Kết quả mục kiểm lưu qua `POST /phieu-kiem/check-item`.
10. Khi đủ dữ liệu section, tính/chốt AQL qua `POST /phieu-kiem/calculate-aql`.
11. Khi tất cả section có kết luận, KCS/leader hoàn tất phiếu qua `POST /phieu-kiem/complete`.
12. Phiếu chuyển `CHO_XUONG_XAC_NHAN`; user có `XAC_NHAN_PX` xác nhận qua `POST /phieu-kiem/xac-nhan-px`.
13. Sau xác nhận trưởng bộ phận/PX, phiếu chuyển `HOAN_TAT`.
14. Khi hoàn tất, Web có thể xem/in phiếu bằng các print template trong `sohoa-bbk-web/src/features/PhieuKiem/components/`.
15. Nếu phát sinh KPH/biên bản, phiếu có `BienBanId` và UI cho mở sang biên bản tương ứng.

## 7. Luồng Theo Loại Kiểm

### 7.1 Đóng Cont Từ ESAM

- Loại kiểm có `MaLoai === 'KIEM_DONG_CONT'`.
- Web tạo phiếu lấy nguồn từ `GET /hr/lich-dong-cont` với `week`, `year`.
- Danh sách nguồn đã kiểm lấy qua `GET /phieu-kiem/source-checked` để lọc trùng.
- Backend `/api/hr/lich-dong-cont` gọi database ESAM qua `db1.js` và stored procedure `[Sale].[SP_ESAM_ClosingSchedule_LichDongCong_V2]`.

### 7.2 Đầu Vào

- Loại kiểm có `MaLoai === 'DAU_VAO'`.
- Web tạo phiếu lấy chứng từ nhập chưa kiểm qua `GET /phieu-kiem/chung-tu-nhap/chua-kiem`.
- Có filter theo chủng loại vật tư trong màn tạo phiếu.
- Sau khi tạo, luồng kiểm dùng chung `PhieuKiemDetail` và `CheckItemScreen`.

### 7.3 Kiểm Trên Chuyền

- Loại kiểm có `MaLoai === 'KIEM_TREN_CHUYEN'`.
- Mapping chắc chắn: `LoaiKiemId === 6` là kiểm trên chuyền.
- Web tạo phiếu lấy kế hoạch sản xuất chưa kiểm qua `GET /phieu-kiem/ke-hoach-san-xuat/chua-kiem`.
- Khi tạo phiếu, `PHIEU_KIEM.SourceId` lưu trực tiếp `ID_KeHoachSanXuat`.
- Kiểm trên chuyền có luồng riêng, không dùng `section/check item/AQL` của phiếu thường.
- Dữ liệu lưu theo 3 tầng:
  - `slot`: khung giờ
  - `entry`: công đoạn trong khung giờ
  - `entry defect`: lỗi, số lượng, ảnh
- Danh sách giờ cố định nằm ở client (`07:30 ... 16:30`), nhưng giờ nào user chọn và lưu thì DB mới tạo record giờ đó.
- Mobile có 2 màn riêng:
  - `TrenChuyenInspectionScreen`: tổng quan phiếu và danh sách khung giờ
  - `TrenChuyenSlotDetailScreen`: chi tiết một khung giờ
- Web có route detail riêng cho kiểm trên chuyền, không đi vào `PhieuKiemDetail` thường.
- Phiếu có thể `Lưu`, `Hoàn tất phiếu`, và `Sinh biên bản`.
- Biên bản không tự sinh khi hoàn tất; user chủ động bấm `Sinh biên bản`.
- Nếu phiếu đã có `BienBanId`, UI phải chuyển sang `Xem biên bản`.

### 7.4 Sản Xuất Bổ Trợ, SXBT

- Mapping chắc chắn: `LoaiKiemId === 4` là SXBT.
- Web route chi tiết phiếu: `/phieu-kiem/sxbt/:id`, component `SxbtDetail`.
- Mobile route chi tiết phiếu: `SxbtInspection`, screen `SxbtInspectionScreen`.
- Tạo phiếu SXBT dùng `POST /phieu-kiem/create-sxbt`.
- Nguồn tạo phiếu SXBT lấy từ `GET /phieu-kiem/phieu-nhap-btp/chua-kiem`.
- Dữ liệu SXBT gồm điều kiện vận chuyển, danh sách BTP, tỷ lệ kiểm, lỗi, kết luận.
- Mobile/Web lưu tạm SXBT qua `POST /phieu-kiem/sxbt-save` với `dynamicFields`, `btpItems`, `summary`, `defects`, `ketLuan`.
- Hoàn tất SXBT gọi `POST /phieu-kiem/sxbt-complete`.
- Tách và hoàn tất SXBT gọi `POST /phieu-kiem/sxbt/split-complete` với số lượng KĐ nguyên theo từng `lotRowId`. Phiếu gốc `DAT`, phiếu mới hậu tố `-KĐ` và `KHONG_DAT`; cả hai chuyển `CHO_KHO_XAC_NHAN`.
- Khi tách, lỗi của dòng có số lượng KĐ lớn hơn `0` chuyển sang phiếu `-KĐ`; lỗi dòng `0` hoặc chưa gắn lot giữ ở phiếu gốc. Một phiếu chỉ tách một lần và phiếu KĐ phải nhận ít nhất một lỗi.
- Sau khi KCS hoàn tất, phiếu chuyển sang `CHO_KHO_XAC_NHAN`.
- Kho nhập đủ số lượng cho từng dòng lot và gọi `POST /phieu-kiem/sxbt/confirm-kho` với quyền `XAC_NHAN_KHO_SXBT`; phiếu chuyển `HOAN_THANH`.
- Bộ phận SXBT ký xác nhận trên bản cứng. Endpoint `POST /phieu-kiem/sxbt/confirm-sxbt` và quyền `XAC_NHAN_SXBT` được giữ dự phòng nhưng tạm ẩn khỏi Mobile/Web.
- UI SXBT khóa phần dữ liệu KCS khi `CHO_KHO_XAC_NHAN`, `CHO_SXBT_XAC_NHAN`, `CHO_XUONG_XAC_NHAN`, `CHO_KIEM_NGHIEM`, `HOAN_THANH`, `HOAN_TAT`.
- Nếu SXBT có biên bản, mở sang `/bien-ban/sxbt/:id` hoặc mobile `BienBanSxbtDetail`.

### 7.5 Kiểm Cuối/Đầu Ra

- Mapping hiện có trong UI: `LoaiKiemId === 5` hiển thị thêm trường `Nơi đến (DoiTuong)`.
- Chưa có route API riêng cho kiểm cuối; đang dùng bộ API chung `phieu-kiem/*`.
- Luồng thao tác giống phiếu thường: tạo section, kiểm item, AQL, complete, PX, kiểm nghiệm, hoàn tất.

## 8. Luồng Kiểm Đặc Biệt

Kiểm đặc biệt áp dụng khi sản phẩm có thông số kỹ thuật riêng.

- Danh mục thông số cấu hình trong danh mục sản phẩm/thông số.
- Nếu API chi tiết phiếu trả về danh sách `thongSo`, UI hiển thị nút vào kiểm đặc biệt.
- Mobile screen: `KiemDacBietScreen`.
- Lấy kết quả: `GET /phieu-kiem/:id/thong-so-kq`.
- Lưu kết quả: `POST /phieu-kiem/:id/thong-so-kq` với `{ results }`.
- Nếu mẫu đo ngoài dung sai, kết quả đặc biệt ảnh hưởng kết luận tổng của phiếu.

## 9. Luồng Biên Bản Thường

Biên bản thường quản lý lỗi/KPH phát sinh từ phiếu kiểm.

1. Biên bản được tạo/liên kết từ phiếu kiểm khi có KPH hoặc nghiệp vụ cần lập biên bản.
2. Danh sách biên bản: `GET /bien-ban`.
3. Backend lọc danh sách theo quyền/người liên quan nếu user không phải manager, QA hoặc lead.
4. Chi tiết biên bản: `GET /bien-ban/:id`.
5. Chi tiết gồm `info`, `defects`, `assigns`, `xuLy`, `chiPhi`, `xacNhan`, `hanhDong`, `dynamicFields`.
6. Lỗi từ phiếu có ảnh; UI cần render URL ảnh đúng host.
7. Cập nhật mô tả/thông tin biên bản qua `POST /bien-ban/update` hoặc `POST /bien-ban/update-mo-ta`.
8. Phân công bộ phận qua `POST /bien-ban/:id/assign`.
9. Xác nhận phân công qua `POST /bien-ban/:id/confirm-assign`.
10. Lấy user có thể xử lý theo bộ phận qua `GET /bien-ban/:id/assign-users` với optional `boPhanId`.
11. Phân công người xử lý qua `POST /bien-ban/:id/assign-user`.
12. Người liên quan thêm ý kiến xử lý qua `POST /bien-ban/xu-ly`.
13. Thêm chi phí qua `POST /bien-ban/chi-phi`.
14. Thêm hành động qua `POST /bien-ban/hanh-dong`.
15. Người xử lý/xác nhận gọi `POST /bien-ban/xac-nhan`.
16. Hoàn thành biên bản qua `POST /bien-ban/complete`.
17. Field động lưu qua `POST /bien-ban/custom-fields`.

Trạng thái biên bản thường thấy ở UI:

- `DA_KET_LUAN`: đã kết luận.
- `CHO_XAC_NHAN`: chờ xác nhận.
- `DA_XAC_NHAN`: đã xác nhận.

## 10. Luồng Biên Bản SXBT

Biên bản SXBT có luồng riêng tại `/api/bien-ban-sxbt`.

- Nhận diện biên bản SXBT khi `LoaiBienBan === 'SXBT'`, `LoaiKiemId === 4`, hoặc `TrangThai` bắt đầu bằng `BB_SXBT`.
- Chi tiết: `GET /bien-ban-sxbt/:id`.
- Dữ liệu chi tiết gồm `info`, `defects`, `xuLyRows`, `hanhDong`, `dynamicFields`, `confirmSteps`.
- TPB8 lưu draft qua `POST /bien-ban-sxbt/:id/save-draft-by-tpb8` với mô tả chung, mức độ không phù hợp, dòng xử lý và hành động.
- Mức độ không phù hợp chỉ hợp lệ `B` hoặc `C`.
- Xác nhận mức độ qua `POST /bien-ban-sxbt/:id/confirm-muc-do`; sau khi xác nhận thì khóa không cho đổi mức độ.
- Khi xác nhận mức độ, backend tạo các bước xác nhận theo bộ phận tùy mức độ.
- Thêm/cập nhật dòng xử lý qua `POST /bien-ban-sxbt/:id/xu-ly-row`.
- Submit biên bản qua `POST /bien-ban-sxbt/:id/submit`, yêu cầu quyền `KET_LUAN`.
- Bộ phận đang đến lượt xác nhận gọi `POST /bien-ban-sxbt/:id/confirm-step`.
- Hoàn tất biên bản SXBT qua `POST /bien-ban-sxbt/:id/complete`, yêu cầu quyền `KET_LUAN`.
- Trạng thái UI thường gặp: `BB_SXBT_MOI`, `BB_SXBT_TP_B8_DRAFT`, `BB_SXBT_CHO_XAC_NHAN`, `BB_SXBT_HOAN_TAT`.

## 10.1 Luồng Phiếu Xử Lý Không Phù Hợp Độc Lập

- Web có thêm menu riêng: `Phiếu xử lý không phù hợp`.
- Đây là luồng độc lập với phiếu kiểm, không cần `PhieuKiemId` hay kế hoạch sản xuất.
- Route web:
  - list: `/phieu-xu-ly-khong-phu-hop`
  - detail: `/phieu-xu-ly-khong-phu-hop/:id`
- API backend:
  - `GET /api/phieu-xu-ly-khong-phu-hop`
  - `POST /api/phieu-xu-ly-khong-phu-hop`
  - `GET /api/phieu-xu-ly-khong-phu-hop/:id`
  - `POST /api/phieu-xu-ly-khong-phu-hop/:id/header`
  - `POST /api/phieu-xu-ly-khong-phu-hop/:id/defects`
- Phân biệt luồng này bằng `BIEN_BAN_KIEM.LoaiBienBan = 'STANDALONE'`.
- `BIEN_BAN_KIEM.PhieuKiemId` phải cho phép `NULL` để lưu biên bản độc lập.
- Phần đầu phiếu lưu bằng `BienBan_CustomFields`, không thêm nhiều cột cứng vào `BIEN_BAN_KIEM`.
- Danh sách dòng lỗi lưu ở bảng riêng `BIEN_BAN_DEFECT`.
  - hỗ trợ cả dòng chọn từ `DM_DEFECT`
  - và dòng nhập tay tự do
- Số biên bản dùng chung series với biên bản hiện tại.
- Từ phần phân bổ xử lý trở xuống tái dùng hạ tầng đang có:
  - `BIEN_BAN_ASSIGN`
  - `BIEN_BAN_XU_LY`
  - `BIEN_BAN_CHI_PHI`
  - `BIEN_BAN_HANH_DONG`
  - `BIEN_BAN_XAC_NHAN`
  - `sp_BienBan_Complete`
- Xem in dùng template riêng `PhieuXuLyKhongPhuHopPrintTemplate`, nhưng vẫn lưu các field in qua `BienBan_CustomFields`.

## 11. Luồng Danh Mục

Web route `/danh-muc`, component `DanhMucManager`, gồm các nhóm:

- `DEFECT`: danh mục lỗi.
- `NHOM_KIEM`: nhóm kiểm.
- `CHECK_ITEM`: mục kiểm.
- `SAN_PHAM`: sản phẩm/vật tư, nhóm kiểm theo sản phẩm, thông số sản phẩm.
- `INSPECTION_LEVEL`: bậc/mức kiểm tra.

Các endpoint lookup chính:

- Loại kiểm: `GET /lookup/loai-kiem`.
- KCS: `GET /lookup/kcs`.
- Danh mục lỗi: `GET /lookup/defect-list`, `POST /lookup/defect`, `PUT /lookup/defect/:id`, `DELETE /lookup/defect/:id`.
- Upload ảnh lỗi danh mục: `POST /lookup/defect-image`, yêu cầu `QUAN_TRI_DM`.
- Nhóm kiểm: `GET/POST/PUT/DELETE /lookup/nhom-kiem`.
- Check item: `GET/POST/PUT/DELETE /lookup/check-item`.
- Sản phẩm: `GET/POST/PUT/DELETE /lookup/san-pham`.
- Nhóm kiểm theo sản phẩm: `/lookup/san-pham/:id/nhom-kiem`, `/lookup/san-pham-nhom-kiem`.
- Inspection level: `/lookup/inspection-level`, `/lookup/inspection-levels`.
- Thông số sản phẩm: `/lookup/san-pham/:id/thong-so`, `/lookup/san-pham-thong-so`.
- Import/export Excel danh mục kiểm và thông số kiểm có timeout dài, cần giữ `multipart/form-data` và `responseType: 'blob'` ở frontend.

Khi sửa danh mục, chú ý dữ liệu danh mục ảnh hưởng trực tiếp section/checklist/AQL của phiếu kiểm.

## 12. Luồng Thông Báo Và Push Token

Mobile có luồng thông báo tại `NotificationScreen`.

- Lấy thông báo: `GET /notifications`.
- Đánh dấu một thông báo đã đọc: `POST /notifications/:id/read`.
- Đánh dấu tất cả đã đọc: `POST /notifications/read-all`.
- Lưu Expo push token sau đăng nhập: `POST /auth/save-push-token`.
- Xóa push token khi đăng xuất: `POST /auth/remove-push-token`.
- Thông báo có thể điều hướng về phiếu kiểm theo `ReferenceId`.

## 13. Mapping Màn Hình Web

Web routes trong `sohoa-bbk-web/src/routes/AppRoutes.jsx`:

- `/login`: đăng nhập.
- `/dashboard`: dashboard.
- `/phieu-kiem`: danh sách phiếu kiểm.
- `/phieu-kiem/create`: tạo phiếu kiểm.
- `/phieu-kiem/:id`: chi tiết phiếu kiểm thường.
- `/phieu-kiem/sxbt/:id`: chi tiết phiếu SXBT.
- `/bien-ban`: danh sách biên bản.
- `/bien-ban/:id`: chi tiết biên bản thường.
- `/bien-ban/sxbt/:id`: chi tiết biên bản SXBT.
- `/danh-muc`: quản trị danh mục.

Menu chính ở `Sidebar`: Dashboard, Phiếu kiểm, Biên bản, Danh mục.

## 14. Mapping Màn Hình Mobile

Mobile navigation trong `kcs-mobile/src/navigation/AppNavigator.js`:

- `Login`: đăng nhập.
- `Home`: màn home.
- `PhieuList`: danh sách phiếu kiểm của user.
- `PhieuDetail`: chi tiết phiếu thường.
- `SxbtInspection`: chi tiết/kiểm phiếu SXBT.
- `CheckItem`: nhập kết quả một mục kiểm.
- `KiemDacBiet`: nhập kết quả kiểm thông số đặc biệt.
- `BienBanList`: danh sách biên bản.
- `BienBanDetail`: chi tiết biên bản thường.
- `BienBanSxbtDetail`: chi tiết biên bản SXBT.
- `Notifications`: thông báo.

Điều hướng danh sách phiếu:

- Nếu `item.LoaiKiemId === 4`, mở `SxbtInspection`.
- Ngược lại mở `PhieuDetail`.

Điều hướng danh sách biên bản:

- Nếu là SXBT, mở `BienBanSxbtDetail`.
- Ngược lại mở `BienBanDetail`.

## 15. Quy Ước Khi Sửa Code

- Đọc `AGENT.md`, `README.md`, route API và API client liên quan trước khi sửa nghiệp vụ.
- Giữ đồng bộ Web và Mobile nếu endpoint, payload hoặc trạng thái dùng chung.
- Nếu thêm endpoint backend, thêm wrapper tương ứng trong API client frontend/mobile khi cần.
- Nếu sửa permission hoặc điều kiện hiện nút, kiểm tra cả màn list và màn detail.
- Nếu sửa upload/ảnh, kiểm tra cả đường dẫn lưu server, path trả API và cách ghép URL ở Web/Mobile.
- Nếu sửa SXBT, kiểm tra cả phiếu SXBT và biên bản SXBT vì hai luồng liên kết qua `BienBanId`.
- Nếu sửa kiểm đặc biệt, kiểm tra danh mục thông số sản phẩm và màn nhập kết quả.
- Không tự ý đổi `LoaiKiemId === 4` cho SXBT hoặc `LoaiKiemId === 5` cho kiểm cuối nếu chưa cập nhật toàn hệ thống.
- Không tự ý đổi trạng thái `TAO_MOI`, `DA_TAO_SECTION`, `DANG_KIEM`, `CHO_XUONG_XAC_NHAN`, `CHO_KIEM_NGHIEM`, `HOAN_TAT`, `BB_SXBT_*`.
- Với nghiệp vụ database phức tạp, ưu tiên thêm/sửa stored procedure và gọi từ route, thay vì nhúng nhiều SQL trong Express.
- Sau khi sửa frontend, chạy ít nhất `npm run build` hoặc `npm run lint` trong package liên quan nếu môi trường cho phép.
- Sau khi sửa backend, kiểm tra syntax bằng chạy server hoặc command phù hợp nếu có database/env.

## 16. File Nên Xem Theo Loại Việc

Phiếu kiểm:

- Backend: `server/routes/phieuKiem.js`.
- Web API: `sohoa-bbk-web/src/api/phieuKiem.api.js`.
- Web UI: `sohoa-bbk-web/src/features/PhieuKiem/pages/`.
- Mobile API: `kcs-mobile/src/api/phieuKiem.api.js`.
- Mobile UI: `kcs-mobile/src/screens/PhieuDetailScreen.js`, `CheckItemScreen.js`, `SxbtInspectionScreen.js`, `KiemDacBietScreen.js`.

Biên bản:

- Backend thường: `server/routes/bienBan.js`.
- Backend SXBT: `server/routes/bienBanSxbt.js`.
- Web API: `sohoa-bbk-web/src/api/bienBan.api.js`.
- Web UI: `sohoa-bbk-web/src/features/BienBan/`.
- Mobile API: `kcs-mobile/src/api/bienBan.api.js`.
- Mobile UI: `kcs-mobile/src/screens/BienBanDetailScreen.js`, `BienBanSxbtDetailScreen.js`.

Danh mục:

- Backend: `server/routes/lookup.routes.js`.
- Web API: `sohoa-bbk-web/src/api/lookup.api.js`.
- Web UI: `sohoa-bbk-web/src/features/DanhMuc/`.

Auth/thông báo:

- Backend auth: `server/routes/auth.js`.
- Backend notification: `server/routes/notifications.js`.
- Web auth utils: `sohoa-bbk-web/src/utils/auth.js`.
- Mobile auth utils: `kcs-mobile/src/utils/auth.js`.
- Mobile notification API/UI: `kcs-mobile/src/api/notification.api.js`, `NotificationScreen.js`.
