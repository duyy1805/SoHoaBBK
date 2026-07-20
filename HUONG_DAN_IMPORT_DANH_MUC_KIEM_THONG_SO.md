# Hướng Dẫn Import Danh Mục Kiểm Và Thông Số Đặc Biệt

Tài liệu này hướng dẫn cách chuẩn bị và import Excel cho hai nhóm dữ liệu:

- Danh mục kiểm: nhóm kiểm, mục kiểm/check item, gán nhóm kiểm vào sản phẩm.
- Thông số đặc biệt: cấu hình thông số kiểm theo sản phẩm để dùng cho luồng kiểm đặc biệt.

Cả hai luồng import chỉ áp dụng cho tài khoản có quyền `QUAN_TRI_DM`. File import phải là `.xlsx`, đúng tên sheet và đúng tên cột theo file mẫu.

## 1. Nguyên Tắc Chung

1. Sản phẩm phải tồn tại trước trong danh mục sản phẩm.
2. Cột `MaSanPham` trong Excel phải khớp với mã sản phẩm đang có trên hệ thống.
3. Nên tải file mẫu từ hệ thống rồi điền dữ liệu theo đúng cột, không đổi tên sheet và tên cột.
4. Nên export dữ liệu hiện có của sản phẩm trước khi sửa hàng loạt để có file backup.
5. Import là thao tác thêm mới hoặc cập nhật:
   - Nếu hệ thống tìm thấy bản ghi trùng theo khóa nhận diện, bản ghi sẽ được cập nhật.
   - Nếu chưa có bản ghi, hệ thống sẽ tạo mới.
6. Nếu file có lỗi validate, hệ thống sẽ không import và trả danh sách lỗi theo từng dòng.

## 2. Import Danh Mục Kiểm

### 2.1. Mục Đích

File danh mục kiểm dùng để import đồng thời:

- Nhóm kiểm.
- Mục kiểm/check item trong từng nhóm.
- Quan hệ gán nhóm kiểm vào sản phẩm.

### 2.2. Thao Tác Trên Web

Vào `Danh mục` -> `Chi tiết Mục kiểm`:

1. Bấm `Import Excel`.
2. Bấm `Tải file mẫu` nếu chưa có file mẫu.
3. Chọn file `.xlsx`.
4. Bấm `Import`.
5. Xem kết quả tổng hợp: tổng dòng, số nhóm kiểm tạo/cập nhật, số mục kiểm tạo/cập nhật, số gán sản phẩm tạo/cập nhật.

Có thể tải danh mục kiểm hiện có theo từng sản phẩm tại `Danh mục` -> `Sản phẩm`, bấm icon tải xuống màu xanh ở cột `Cấu hình`.

### 2.3. Endpoint Liên Quan

- Tải file mẫu: `GET /api/lookup/import-danh-muc-kiem/template`
- Import: `POST /api/lookup/import-danh-muc-kiem`
- Export theo sản phẩm: `GET /api/lookup/san-pham/:sanPhamId/danh-muc-kiem/export`

Khi gọi API import từ frontend/curl, gửi file bằng `multipart/form-data`, field file là `file`.

### 2.4. Tên Sheet

Sheet bắt buộc: `DanhMucKiem`

### 2.5. Cấu Trúc Cột

| Cột | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `MaSanPham` | Có | Mã sản phẩm/vật tư đã tồn tại trong hệ thống. |
| `TenNhom` | Có | Tên nhóm kiểm. |
| `MoTaNhom` | Có | Mô tả nhóm kiểm, dùng để phân biệt các nhóm trùng tên. |
| `ThuTuNhom` | Không | Thứ tự hiển thị của nhóm kiểm. Nếu để trống, hệ thống lấy thứ tự theo dòng import. |
| `TenMucKiem` | Có | Tên mục kiểm/check item. |
| `ThamChieu` | Không | Tài liệu/mẫu/tiêu chuẩn tham chiếu. |
| `PhuongPhapKiem` | Không | Cách kiểm tra. |
| `TieuChuan` | Không | Tiêu chuẩn chấp nhận. |
| `ThuTuMuc` | Không | Thứ tự của mục kiểm trong nhóm. Nếu để trống, hệ thống lấy thứ tự theo dòng import. |
| `ThuTuGanNhom` | Không | Thứ tự nhóm kiểm khi gán vào sản phẩm. Nếu để trống, hệ thống lấy thứ tự theo dòng import. |
| `DiemTrongYeu` | Không | Nhận `Có/Không`, `true/false` hoặc `1/0`. Để trống sẽ giữ nguyên giá trị của mục đã có; mục mới mặc định là `Không`. |

### 2.6. Khóa Cập Nhật

Hệ thống nhận diện bản ghi như sau:

- Nhóm kiểm: theo `TenNhom` + `MoTaNhom`.
- Mục kiểm: theo nhóm kiểm và `TenMucKiem`.
- Gán nhóm vào sản phẩm: theo `MaSanPham` + nhóm kiểm.

Vì vậy, nếu muốn cập nhật đúng nhóm cũ, cần giữ nguyên `TenNhom` và `MoTaNhom`. Đổi `MoTaNhom` có thể làm hệ thống xem là nhóm mới.

### 2.7. Ví Dụ

| MaSanPham | TenNhom | MoTaNhom | ThuTuNhom | TenMucKiem | ThamChieu | PhuongPhapKiem | TieuChuan | ThuTuMuc | ThuTuGanNhom | DiemTrongYeu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SP001 | Ngoại quan | Kiểm ngoại quan của balo | 1 | Bề mặt vải | Bản vẽ/tiêu chuẩn | Quan sát bằng mắt thường | Không trầy xước, móp méo | 1 | 1 | Có |

## 3. Import Thông Số Đặc Biệt

### 3.1. Mục Đích

File thông số đặc biệt dùng để cấu hình các thông số cần đo/kiểm theo sản phẩm. Khi phiếu kiểm của sản phẩm có danh sách thông số, mobile/web sẽ hiển thị luồng `Kiểm đặc biệt` để nhập kết quả.

### 3.2. Thao Tác Trên Web

Vào `Danh mục` -> `Sản phẩm`:

1. Bấm `Import thông số`.
2. Bấm `Tải file mẫu` nếu chưa có file mẫu.
3. Chọn file `.xlsx`.
4. Bấm `Import`.
5. Xem kết quả tổng hợp: tổng dòng, số thông số tạo mới, số thông số cập nhật.

Trong bảng sản phẩm:

- Bấm `Thông số kiểm` để xem/thêm/sửa thông số của từng sản phẩm.
- Bấm icon tải xuống màu xanh dương ở cột `Cấu hình` để export thông số kiểm của sản phẩm đó.

### 3.3. Endpoint Liên Quan

- Tải file mẫu: `GET /api/lookup/import-thong-so-kiem/template`
- Import: `POST /api/lookup/import-thong-so-kiem`
- Export theo sản phẩm: `GET /api/lookup/san-pham/:sanPhamId/thong-so/export`

Khi gọi API import từ frontend/curl, gửi file bằng `multipart/form-data`, field file là `file`.

### 3.4. Tên Sheet

Sheet bắt buộc: `ThongSoKiem`

### 3.5. Cấu Trúc Cột

| Cột | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `MaSanPham` | Có | Mã sản phẩm/vật tư đã tồn tại trong hệ thống. |
| `NhomThongSo` | Có | Nhóm thông số, ví dụ `Kích thước sản phẩm`. |
| `TenThongSo` | Không | Tên thông số, ví dụ `Dài`, `Rộng`, `Cao`. |
| `GiaTriChuan` | Có | Giá trị chuẩn cần kiểm. Lưu dạng chuỗi nên có thể nhập số hoặc mô tả ngắn. |
| `DungSaiAm` | Không | Dung sai âm. Nếu để trống hoặc không phải số, hệ thống lưu `0`. |
| `DungSaiDuong` | Không | Dung sai dương. Nếu để trống hoặc không phải số, hệ thống lưu `0`. |
| `DonVi` | Không | Đơn vị đo, ví dụ `mm`, `cm`, `kg`. |
| `ThuTu` | Không | Thứ tự hiển thị. Nếu để trống, hệ thống lấy thứ tự theo dòng import. |

### 3.6. Khóa Cập Nhật

Hệ thống nhận diện thông số theo:

- `MaSanPham`
- `NhomThongSo`
- `TenThongSo`

Nếu trùng bộ khóa này, import sẽ cập nhật thông số cũ. Nếu khác `NhomThongSo` hoặc `TenThongSo`, hệ thống sẽ tạo thông số mới.

### 3.7. Ví Dụ

| MaSanPham | NhomThongSo | TenThongSo | GiaTriChuan | DungSaiAm | DungSaiDuong | DonVi | ThuTu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SP001 | Kích thước sản phẩm | Dài | 580 | 5 | 5 | mm | 1 |
| SP001 | Kích thước sản phẩm | Rộng | 320 | 3 | 3 | mm | 2 |

## 4. Lỗi Thường Gặp

| Thông báo | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `File phải có sheet tên DanhMucKiem` | File import danh mục kiểm sai tên sheet. | Đổi tên sheet thành `DanhMucKiem` hoặc tải lại file mẫu. |
| `File phải có sheet tên ThongSoKiem` | File import thông số sai tên sheet. | Đổi tên sheet thành `ThongSoKiem` hoặc tải lại file mẫu. |
| `Thiếu MaSanPham` | Dòng dữ liệu chưa có mã sản phẩm. | Điền `MaSanPham`. |
| `MaSanPham không tồn tại` | Mã sản phẩm trong file chưa có trên hệ thống. | Tạo sản phẩm trước, hoặc sửa lại mã sản phẩm đúng. |
| `Thiếu TenNhom` | Dòng danh mục kiểm chưa có tên nhóm. | Điền `TenNhom`. |
| `Thiếu MoTaNhom để phân biệt nhóm kiểm` | Dòng danh mục kiểm chưa có mô tả nhóm. | Điền `MoTaNhom`. |
| `Thiếu TenMucKiem` | Dòng danh mục kiểm chưa có mục kiểm. | Điền `TenMucKiem`. |
| `DiemTrongYeu chỉ nhận Có/Không, true/false hoặc 1/0` | Giá trị điểm trọng yếu không hợp lệ. | Sửa về một trong các giá trị được hỗ trợ hoặc để trống. |
| `Thiếu NhomThongSo` | Dòng thông số đặc biệt chưa có nhóm thông số. | Điền `NhomThongSo`. |
| `Thiếu GiaTriChuan` | Dòng thông số đặc biệt chưa có giá trị chuẩn. | Điền `GiaTriChuan`. |
| `Chỉ hỗ trợ file .xlsx` | File không đúng định dạng. | Lưu lại thành Excel `.xlsx`. |

## 5. Lưu Ý Khi Chuẩn Bị File

- Không gộp ô trong Excel, không để dòng tiêu đề phụ phía trên bảng dữ liệu.
- Không đổi tên cột. Nên giữ nguyên cả dấu cách, chữ hoa/chữ thường như file mẫu.
- Mỗi dòng danh mục kiểm nên tương ứng một mục kiểm của một sản phẩm.
- Một nhóm kiểm có nhiều mục kiểm thì lặp lại `MaSanPham`, `TenNhom`, `MoTaNhom` trên nhiều dòng.
- Một sản phẩm có nhiều thông số đặc biệt thì mỗi dòng là một thông số.
- Trước khi import file lớn, nên thử với 2-3 dòng đầu để kiểm tra đúng khóa cập nhật.
- File import danh mục kiểm và thông số đặc biệt giới hạn 5 MB.

## 6. Ghi Chú Cho Dev

Frontend wrapper nằm tại `sohoa-bbk-web/src/api/lookup.api.js`:

- `importDanhMucKiemExcel(file)`
- `downloadDanhMucKiemTemplate()`
- `exportSanPhamDanhMucKiem(sanPhamId)`
- `importThongSoKiemExcel(file)`
- `downloadThongSoKiemTemplate()`
- `exportSanPhamThongSo(sanPhamId)`

Backend xử lý trong `server/routes/lookup.routes.js` bằng `multer.memoryStorage()` và `xlsx`.

Khi sửa luồng import/export, cần giữ:

- `multipart/form-data` cho import.
- `responseType: "blob"` cho download/export trên frontend.
- Timeout dài cho import/export vì file Excel có thể lớn.
- Transaction trong backend để tránh import nửa chừng khi có lỗi.
