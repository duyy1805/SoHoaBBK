# KCS Mobile - Nghiệp vụ luồng phiếu kiểm

Tài liệu này mô tả luồng xử lý thực tế đang được app mobile triển khai, để agent có thể đọc lại và bám đúng nghiệp vụ khi sửa code.

## 1) Điểm vào và phân loại phiếu

- Danh sách phiếu lấy từ API `GET /phieu-kiem/my` (xem `src/api/phieuKiem.api.js` + `src/screens/PhieuListScreen.js`).
- Khi bấm vào 1 phiếu:
  - Nếu `LoaiKiemId === 4`: đi vào màn `SxbtInspectionScreen` (phiếu sản xuất bổ trợ).
  - Các loại còn lại: đi vào `PhieuDetailScreen` (dùng chung cho đầu vào/kiểm cuối và các loại kiểm chuẩn).

## 2) Trạng thái chính của phiếu

Các trạng thái xuất hiện trong app:

- `TAO_MOI`: vừa tạo, chưa thiết lập section.
- `DA_TAO_SECTION`: đã tạo section kiểm, chưa xác nhận kết quả cuối.
- `DANG_KIEM`: đang thực hiện kiểm.
- `CHO_XUONG_XAC_NHAN`: chờ xác nhận phía xưởng/kho.
- `CHO_KIEM_NGHIEM`: chờ xác nhận kiểm nghiệm.
- `HOAN_TAT`: hoàn tất.
- Với phiếu SXBT còn thấy `HOAN_THANH` ở lớp UI, được xem là trạng thái đã khóa sửa.

## 3) Phân quyền thao tác

Quyền được đọc từ `user.permissions`:

- `THUC_HIEN_KIEM`: KCS trực tiếp kiểm và hoàn tất bước kiểm.
- `PHAN_BO_KIEM`: leader có thể thao tác như KCS ở luồng section.
- `XAC_NHAN_PX`: xác nhận bước xưởng/kho.
- `XAC_NHAN_KIEM_NGHIEM`: xác nhận bước kiểm nghiệm cuối.

## 4) Luồng phiếu đầu vào (incoming)

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

## 5) Luồng phiếu kiểm cuối (final inspection)

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

## 6) Luồng phiếu sản xuất bổ trợ (SXBT)

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

## 7) Luồng kiểm đặc biệt (áp dụng bổ sung)

Trong `PhieuDetailScreen`, nếu API trả về danh sách thông số đặc biệt (`thongSo`) thì xuất hiện nút vào màn `KiemDacBietScreen`:

1. Tải dữ liệu: `GET /phieu-kiem/:id/thong-so-kq`.
2. Nhập kết quả đo theo ma trận thông số x mẫu.
3. Lưu: `POST /phieu-kiem/:id/thong-so-kq`.
4. Kết quả đặc biệt được dùng khi tính kết luận tổng ở màn chi tiết:
   - Có mẫu ngoài dung sai => đánh dấu ảnh hưởng tới kết luận cuối (`KHONG_DAT`).

## 8) Ghi chú mapping nghiệp vụ

- Mapping chắc chắn trong code:
  - `LoaiKiemId === 4` => SXBT.
  - `LoaiKiemId === 5` => có hiển thị `Nơi đến`, đang được dùng cho nhóm phiếu đầu ra/kiểm cuối.
- App chưa có nhánh route riêng cho “đầu vào” và “kiểm cuối”; hai loại này hiện dùng chung luồng `PhieuDetailScreen`.
- Nếu backend thay đổi enum trạng thái hoặc mapping `LoaiKiemId`, cần cập nhật tài liệu này đồng bộ với UI.
