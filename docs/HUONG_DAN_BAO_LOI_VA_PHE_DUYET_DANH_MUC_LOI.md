# Hướng dẫn báo lỗi và phê duyệt danh mục lỗi

**Đối tượng sử dụng:** Người báo lỗi, nhân viên bộ phận B7 và Trưởng bộ phận B7  
**Phiên bản:** 1.0 — ngày 04/08/2026

## 1. Mục đích

Tài liệu này hướng dẫn toàn bộ quy trình:

1. Người dùng gửi một báo lỗi mới.
2. Nhân viên B7 kiểm tra, chỉnh sửa và bổ sung thông tin.
3. Nhân viên B7 trình đề xuất cho Trưởng bộ phận B7.
4. Trưởng bộ phận B7 duyệt hoặc từ chối đề xuất.
5. Lỗi đã duyệt được đưa vào danh mục lỗi dùng chung.

Luồng xử lý tổng quát:

> **Người dùng báo lỗi** → **Chờ B7 bổ sung** → **B7 gửi duyệt** → **Chờ TP B7 duyệt** → **Đã duyệt**

Nếu Trưởng bộ phận B7 từ chối, đề xuất quay lại cho B7 sửa và gửi duyệt lại.

## 2. Quyền của từng đối tượng

| Đối tượng | Công việc chính |
|---|---|
| Người dùng | Báo lỗi mới, theo dõi báo lỗi của mình và rút đề xuất khi cần |
| Nhân viên B7 | Xem các lỗi chờ B7 bổ sung, chỉnh sửa thông tin và gửi TP B7 duyệt |
| Trưởng bộ phận B7 | Xem nội dung đề xuất, duyệt hoặc từ chối; có thể duyệt nhiều đề xuất đã chọn |

> **Lưu ý:** Nếu tài khoản vừa được cấp bộ phận hoặc quyền mới, hãy đăng xuất rồi đăng nhập lại để hệ thống cập nhật quyền.

## 3. Truy cập màn hình Danh mục lỗi

1. Đăng nhập hệ thống Web.
2. Trên thanh menu bên trái, chọn **Danh mục**.
3. Tại ô chọn danh mục, chọn **Danh mục lỗi**.
4. Màn hình **Danh mục lỗi dùng chung** được hiển thị.

Tùy theo quyền tài khoản, màn hình có thể có các thẻ:

- **Danh mục đã duyệt**.
- **Báo lỗi của tôi**.
- **Chờ B7 bổ sung** — dành cho nhân viên B7.
- **Chờ TP B7 duyệt** — dành cho Trưởng bộ phận B7.

> **Ảnh minh họa 01 cần bổ sung:** Màn hình Danh mục lỗi và các thẻ chức năng.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/01-man-hinh-danh-muc-loi.png`

Sau khi có ảnh, chèn vào đây bằng dòng:

```md
![Màn hình Danh mục lỗi](images/huong-dan-danh-muc-loi/01-man-hinh-danh-muc-loi.png)
```

## 4. Hướng dẫn người dùng báo lỗi mới

### Bước 1: Mở biểu mẫu báo lỗi

Tại màn hình **Danh mục lỗi dùng chung**, bấm **Báo lỗi mới**.

> **Ảnh minh họa 02 cần bổ sung:** Vị trí nút Báo lỗi mới.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/02-nut-bao-loi-moi.png`

### Bước 2: Nhập thông tin lỗi

Biểu mẫu có các thông tin sau:

| Trường thông tin | Hướng dẫn |
|---|---|
| Mã lỗi | Khi báo lỗi mới có thể để trống; hệ thống tự sinh mã khi đề xuất được duyệt |
| Mã nhóm lỗi | Chọn nhóm phù hợp từ L01 đến L05 nếu đã xác định được |
| STT | Nhập số thứ tự nếu cần sắp xếp trong nhóm |
| Tên lỗi | **Bắt buộc**; ghi ngắn gọn, rõ hiện tượng lỗi |
| Mô tả chi tiết | **Bắt buộc**; mô tả vị trí, hiện tượng, mức độ và cách phát hiện |
| Ghi chú / Lưu ý | Nhập điều kiện hoặc lưu ý đặc biệt liên quan đến lỗi |
| Phương án xử lý | Nhập phương án xử lý đề xuất nếu đã có |
| Loại B/C | Chọn loại lỗi theo quy định nghiệp vụ |
| Phân loại | Chọn Critical, Major hoặc Minor theo mức độ lỗi |
| Tên sản phẩm | Ghi sản phẩm phát hiện lỗi |
| Chủng loại | Ghi nhóm hoặc chủng loại sản phẩm liên quan |
| Thị trường | Ghi thị trường áp dụng, ví dụ AP, EU hoặc US |
| Phạm vi áp dụng | Chọn một hoặc nhiều phạm vi: Kiểm đầu vào, Kiểm công đoạn, Kiểm hoàn chỉnh |
| Ảnh lỗi | Chọn tối đa 10 ảnh thể hiện rõ lỗi và vị trí phát sinh |

Khi chụp ảnh lỗi nên:

- Có ít nhất một ảnh tổng thể để xác định vị trí.
- Có ảnh cận cảnh thể hiện rõ hiện tượng lỗi.
- Ảnh đủ sáng, không rung và không che mất phần lỗi.
- Không tải nhiều ảnh giống hệt nhau.

> **Ảnh minh họa 03 cần bổ sung:** Biểu mẫu Báo lỗi mới đã nhập dữ liệu mẫu.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/03-bieu-mau-bao-loi-moi.png`

### Bước 3: Gửi báo lỗi

1. Kiểm tra lại **Tên lỗi** và **Mô tả chi tiết**.
2. Bấm **Gửi báo lỗi**.
3. Khi gửi thành công, hệ thống thông báo: **Đã báo lỗi, đang chờ B7 bổ sung**.
4. Đề xuất chuyển sang trạng thái **Chờ B7 bổ sung**.

### Bước 4: Theo dõi báo lỗi đã gửi

1. Mở thẻ **Báo lỗi của tôi**.
2. Tìm theo mã lỗi, tên lỗi hoặc người thêm nếu danh sách dài.
3. Bấm vào báo lỗi để xem lại nội dung và trạng thái.

Người báo lỗi có thể bấm **Rút đề xuất** khi đề xuất chưa được duyệt. Khi đã rút, đề xuất không tiếp tục được B7 hoặc TP B7 xử lý.

> **Ảnh minh họa 04 cần bổ sung:** Thẻ Báo lỗi của tôi và trạng thái Chờ B7 bổ sung.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/04-bao-loi-cua-toi.png`

## 5. Hướng dẫn nhân viên B7 chỉnh sửa và trình duyệt

### Bước 1: Mở danh sách chờ B7 xử lý

1. Vào **Danh mục** → **Danh mục lỗi**.
2. Chọn thẻ **Chờ B7 bổ sung**.
3. Tìm đề xuất cần xử lý.
4. Xem tên lỗi, người báo, nội dung mô tả và ảnh đính kèm trước khi chỉnh sửa.

> **Ảnh minh họa 05 cần bổ sung:** Danh sách Chờ B7 bổ sung.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/05-cho-b7-bo-sung.png`

### Bước 2: Chỉnh sửa và chuẩn hóa thông tin

1. Tại đề xuất cần xử lý, bấm biểu tượng **Sửa**.
2. Hộp thoại **Bổ sung thông tin lỗi** được mở.
3. Đối chiếu nội dung người dùng đã báo với ảnh lỗi và quy định phân loại.
4. Sửa hoặc bổ sung các thông tin còn thiếu.

Trước khi trình duyệt, B7 cần đặc biệt kiểm tra:

- **Tên lỗi:** rõ ràng, không trùng hoặc gần trùng một lỗi đã có trong danh mục.
- **Mô tả chi tiết:** đủ để người kiểm nhận biết và áp dụng thống nhất.
- **Mã nhóm lỗi:** thuộc một trong các nhóm từ **L01 đến L05**.
- **Mã lỗi:** có thể để trống đối với lỗi mới; hệ thống tự sinh khi TP B7 duyệt.
- **Loại B/C và phân loại:** phù hợp với quy định. Loại C được hệ thống chuẩn hóa về Critical; loại B không để ở mức Critical.
- **Phạm vi áp dụng:** chọn đúng Kiểm đầu vào, Kiểm công đoạn và/hoặc Kiểm hoàn chỉnh.
- **Tên sản phẩm, chủng loại, thị trường:** điền đủ nếu lỗi chỉ áp dụng cho một phạm vi sản phẩm hoặc thị trường cụ thể.
- **Phương án xử lý và lưu ý:** viết đủ rõ để người thực hiện biết cách xử lý.
- **Ảnh lỗi:** ảnh đúng lỗi, dễ quan sát và không vượt quá 10 ảnh.

> **Ảnh minh họa 06 cần bổ sung:** Hộp thoại Bổ sung thông tin lỗi của B7.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/06-b7-bo-sung-thong-tin.png`

### Bước 3: Lưu nội dung bổ sung

1. Bấm **Lưu bổ sung**.
2. Chờ thông báo lưu thành công.
3. Kiểm tra lại nội dung trên thẻ đề xuất.

Việc **Lưu bổ sung** chưa đồng nghĩa với việc đã trình TP B7. Đề xuất vẫn nằm tại thẻ **Chờ B7 bổ sung** cho đến khi bấm **Gửi duyệt**.

### Bước 4: Gửi TP B7 duyệt

1. Bấm **Gửi duyệt** trên đề xuất.
2. Hệ thống hỏi: **Gửi đề xuất này cho TP B7 duyệt?**
3. Chọn xác nhận.
4. Khi thành công, hệ thống thông báo **Đã gửi TP B7 duyệt**.
5. Đề xuất chuyển sang trạng thái **Chờ duyệt** và xuất hiện trong thẻ **Chờ TP B7 duyệt**.

> **Ảnh minh họa 07 cần bổ sung:** Nút Gửi duyệt và hộp thoại xác nhận.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/07-b7-gui-duyet.png`

### Bước 5: Sửa đề xuất bị từ chối

Nếu TP B7 từ chối, đề xuất hiển thị **Lý do từ chối**.

1. Đọc đầy đủ lý do từ chối.
2. Bấm **Sửa**.
3. Chỉnh lại đúng nội dung được yêu cầu.
4. Bấm **Lưu bổ sung**.
5. Kiểm tra lại rồi bấm **Gửi duyệt** lần nữa.

Không nên gửi lại khi chưa xử lý hết các ý trong lý do từ chối.

## 6. Hướng dẫn Trưởng bộ phận B7 phê duyệt

### Bước 1: Mở danh sách chờ duyệt

1. Vào **Danh mục** → **Danh mục lỗi**.
2. Chọn thẻ **Chờ TP B7 duyệt**.
3. Tìm đề xuất cần phê duyệt.
4. Bấm **Xem duyệt**.

> **Ảnh minh họa 08 cần bổ sung:** Thẻ Chờ TP B7 duyệt và nút Xem duyệt.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/08-cho-tp-b7-duyet.png`

### Bước 2: Kiểm tra nội dung đề xuất

Hộp thoại **Duyệt đề xuất danh mục lỗi** hiển thị thông tin đề xuất. Với đề xuất sửa lỗi đã có, hệ thống hiển thị dữ liệu hiện tại và dữ liệu đề xuất để so sánh.

TP B7 cần kiểm tra:

- Lỗi có bị trùng với danh mục hiện có hay không.
- Tên lỗi và mô tả có rõ, thống nhất và dễ áp dụng không.
- Mã nhóm, loại B/C và mức phân loại có đúng không.
- Phạm vi kiểm, sản phẩm, chủng loại và thị trường có phù hợp không.
- Phương án xử lý có khả thi và rõ trách nhiệm không.
- Ảnh minh họa có đúng với nội dung mô tả không.
- Đối với đề xuất sửa đổi, các nội dung thay đổi có hợp lý không.

> **Ảnh minh họa 09 cần bổ sung:** Hộp thoại Duyệt đề xuất, phần so sánh và ảnh lỗi.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/09-xem-noi-dung-duyet.png`

### Bước 3A: Duyệt đề xuất

1. Sau khi kiểm tra, bấm **Duyệt**.
2. Đề xuất chuyển sang trạng thái **Đã duyệt**.
3. Lỗi mới được tạo hoặc lỗi hiện có được cập nhật trong thẻ **Danh mục đã duyệt**.
4. Từ thời điểm này lỗi mới có thể được sử dụng chính thức trong các luồng kiểm liên quan.

### Bước 3B: Từ chối đề xuất

1. Bấm **Từ chối**.
2. Nhập **Lý do từ chối** cụ thể, nêu rõ nội dung B7 phải sửa.
3. Xác nhận từ chối.
4. Đề xuất quay lại cho B7 chỉnh sửa và gửi duyệt lại.

Ví dụ lý do từ chối tốt:

> Tên lỗi đang trùng với L02-015. Cần đối chiếu lại danh mục; nếu là lỗi khác, bổ sung ảnh cận cảnh và mô tả điểm khác biệt.

Không nên chỉ ghi các lý do chung chung như “Sai”, “Sửa lại” hoặc “Chưa đạt”.

> **Ảnh minh họa 10 cần bổ sung:** Nút Duyệt, nút Từ chối và ô Lý do từ chối.  
> Tên file đề xuất: `images/huong-dan-danh-muc-loi/10-duyet-hoac-tu-choi.png`

### Duyệt nhiều đề xuất

TP B7 có thể đánh dấu các đề xuất trong thẻ **Chờ TP B7 duyệt** và bấm **Duyệt đã chọn (N)**.

Chỉ dùng chức năng này khi đã mở và kiểm tra từng đề xuất. Không duyệt hàng loạt các đề xuất chưa xem nội dung, ảnh lỗi hoặc khả năng trùng danh mục.

## 7. Ý nghĩa trạng thái

| Trạng thái hiển thị | Ý nghĩa | Người cần thực hiện |
|---|---|---|
| Chờ B7 bổ sung | Báo lỗi mới đã gửi, cần B7 chuẩn hóa thông tin | Nhân viên B7 |
| Chờ duyệt | B7 đã hoàn thiện và trình phê duyệt | TP B7 |
| Đã duyệt | Đề xuất đã được duyệt và có hiệu lực trong danh mục | Không cần xử lý thêm |
| Từ chối | TP B7 yêu cầu chỉnh sửa | Nhân viên B7 |
| Đã rút | Người báo đã dừng đề xuất | Không tiếp tục xử lý |

## 8. Xử lý một số tình huống thường gặp

### Không thấy thẻ “Chờ B7 bổ sung”

- Kiểm tra tài khoản đã được gắn đúng bộ phận B7 chưa.
- Đăng xuất rồi đăng nhập lại sau khi quản trị viên thay đổi bộ phận hoặc quyền.
- Nếu vẫn không thấy, liên hệ quản trị viên kiểm tra thông tin tài khoản.

### TP B7 không thấy thẻ “Chờ TP B7 duyệt”

- Kiểm tra tài khoản có vai trò **TP_BP** tại bộ phận B7.
- Kiểm tra tài khoản có quyền **DUYET_DANH_MUC_LOI**.
- Đăng xuất rồi đăng nhập lại để làm mới quyền.

### Không gửi duyệt được

Kiểm tra các trường bắt buộc hoặc cần chuẩn hóa:

- Tên lỗi.
- Mô tả chi tiết.
- Mã nhóm lỗi hợp lệ từ L01 đến L05.
- Phân loại lỗi hợp lệ.

Nếu hệ thống báo trùng mã hoặc trùng đề xuất đang chờ, cần tìm lại trong danh mục trước khi tạo tiếp.

### Hệ thống báo dữ liệu đã thay đổi

Đề xuất có thể vừa được người khác cập nhật. Hãy tải lại danh sách, mở lại đề xuất, kiểm tra nội dung mới nhất rồi thao tác lại. Không nên nhập lại dựa trên dữ liệu cũ.

### Không tải được ảnh

- Kiểm tra số ảnh đã chọn; mỗi đề xuất tối đa 10 ảnh.
- Kiểm tra định dạng và dung lượng ảnh theo thông báo của hệ thống.
- Thử tải từng nhóm ảnh nhỏ để xác định ảnh không hợp lệ.

## 9. Danh sách kiểm tra nhanh

### Người báo lỗi

- [ ] Tên lỗi ngắn gọn và dễ hiểu.
- [ ] Mô tả rõ hiện tượng, vị trí và mức độ.
- [ ] Có ảnh tổng thể và ảnh cận cảnh nếu có thể.
- [ ] Đã chọn đúng sản phẩm, thị trường và phạm vi áp dụng nếu biết.
- [ ] Đã kiểm tra thông tin trước khi bấm **Gửi báo lỗi**.

### Nhân viên B7

- [ ] Đã kiểm tra khả năng trùng lỗi.
- [ ] Đã chuẩn hóa tên và mô tả.
- [ ] Đã chọn mã nhóm L01–L05.
- [ ] Đã kiểm tra loại B/C và phân loại.
- [ ] Đã xác định phạm vi áp dụng.
- [ ] Đã kiểm tra phương án xử lý, ghi chú và ảnh.
- [ ] Đã bấm **Lưu bổ sung** trước khi **Gửi duyệt**.
- [ ] Nếu bị từ chối, đã xử lý đầy đủ lý do từ chối.

### Trưởng bộ phận B7

- [ ] Đã kiểm tra lỗi trùng.
- [ ] Đã kiểm tra nội dung hiện tại và nội dung đề xuất.
- [ ] Đã kiểm tra mã nhóm, loại và phân loại.
- [ ] Đã kiểm tra phạm vi, sản phẩm và thị trường.
- [ ] Đã xem ảnh lỗi.
- [ ] Nếu từ chối, đã ghi lý do cụ thể và có thể thực hiện được.

## 10. Danh sách ảnh cần bổ sung

Tạo thư mục `docs/images/huong-dan-danh-muc-loi/` và đặt ảnh theo danh sách sau:

| STT | Tên file | Nội dung cần chụp |
|---|---|---|
| 01 | `01-man-hinh-danh-muc-loi.png` | Toàn cảnh màn hình và các thẻ chức năng |
| 02 | `02-nut-bao-loi-moi.png` | Vị trí nút Báo lỗi mới |
| 03 | `03-bieu-mau-bao-loi-moi.png` | Biểu mẫu báo lỗi có dữ liệu mẫu |
| 04 | `04-bao-loi-cua-toi.png` | Danh sách báo lỗi của người dùng |
| 05 | `05-cho-b7-bo-sung.png` | Thẻ Chờ B7 bổ sung |
| 06 | `06-b7-bo-sung-thong-tin.png` | Hộp thoại B7 chỉnh sửa đề xuất |
| 07 | `07-b7-gui-duyet.png` | Nút và xác nhận Gửi duyệt |
| 08 | `08-cho-tp-b7-duyet.png` | Thẻ Chờ TP B7 duyệt |
| 09 | `09-xem-noi-dung-duyet.png` | Hộp thoại xem và so sánh đề xuất |
| 10 | `10-duyet-hoac-tu-choi.png` | Các thao tác Duyệt/Từ chối |

Khi chụp ảnh hướng dẫn:

- Dùng dữ liệu mẫu, không để lộ thông tin nhạy cảm.
- Chụp đủ tiêu đề màn hình và nút thao tác liên quan.
- Có thể dùng khung hoặc mũi tên để làm nổi bật vị trí cần bấm.
- Giữ cùng một kích thước ảnh để tài liệu dễ đọc.

