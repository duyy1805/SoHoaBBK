from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUTPUT = "/Users/luna/Documents/Code/SoHoaBBK/Huong_dan_them_chi_tiet_phoi_doi_tra_phoi_loi.docx"
NAVY = "17365D"
BLUE = "2F75B5"
LIGHT_BLUE = "DDEBF7"
PALE_BLUE = "F4F8FC"
GRAY = "F2F2F2"
BORDER = "D9D9D9"


def set_cell_fill(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color=BORDER, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        el = borders.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:color"), color)


def set_cell_margins(cell, top=110, start=130, bottom=110, end=130):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def keep_with_next(paragraph):
    paragraph.paragraph_format.keep_with_next = True


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    keep_with_next(p)
    return p


def add_steps(doc, steps):
    for step in steps:
        p = doc.add_paragraph(style="List Number")
        p.add_run(step)
        p.paragraph_format.space_after = Pt(5)


def add_bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.add_run(item)
        p.paragraph_format.space_after = Pt(4)


def add_image_placeholder(doc, number, caption, suggested):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"Hình {number}  {caption}")
    r.bold = True
    r.font.size = Pt(10)
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_fill(cell, "FAFAFA")
    set_cell_border(cell, "A6A6A6", "8")
    set_cell_margins(cell, 160, 180, 160, 180)
    cell_p = cell.paragraphs[0]
    cell_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cell_p.paragraph_format.space_before = Pt(26)
    cell_p.paragraph_format.space_after = Pt(26)
    run = cell_p.add_run(f"VỊ TRÍ CHÈN ẢNH {number:02d}\n{suggested}")
    run.bold = True
    run.font.color.rgb = RGBColor(89, 89, 89)
    run.font.size = Pt(11)
    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.paragraph_format.space_before = Pt(3)
    note.paragraph_format.space_after = Pt(10)
    rr = note.add_run("Sau khi chèn ảnh, đặt chế độ In Line with Text và xóa khung giữ chỗ này")
    rr.italic = True
    rr.font.size = Pt(9)
    rr.font.color.rgb = RGBColor(100, 100, 100)


def add_field_table(doc):
    rows = [
        ("Itemcode áp dụng", "Một hoặc nhiều item cần nhận cùng thông tin phôi", "Bắt buộc"),
        ("Vật tư", "Mã vật tư chứa các loại phôi cần khai báo", "Bắt buộc"),
        ("Tên loại phôi", "Tên chi tiết phôi, ví dụ Phôi thân hoặc Cuộn viền", "Bắt buộc"),
        ("Dao chặt", "Mã hoặc tên dao chặt dùng cho loại phôi", "Không bắt buộc"),
        ("Số phôi", "Số lượng phôi của chi tiết; mặc định là 1", "Không bắt buộc"),
        ("Ký hiệu", "Ký hiệu nhận biết loại phôi", "Không bắt buộc"),
        ("Định mức", "Định mức áp dụng cho loại phôi", "Không bắt buộc"),
        ("Phôi in", "Đánh dấu khi chi tiết là phôi in", "Không bắt buộc"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [1.55, 4.35, 1.15]
    headers = ["Trường", "Cách nhập", "Yêu cầu"]
    for i, text in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.width = Inches(widths[i])
        set_cell_fill(cell, NAVY)
        set_cell_border(cell)
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
    for idx, row in enumerate(rows):
        cells = table.add_row().cells
        for i, text in enumerate(row):
            cells[i].width = Inches(widths[i])
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_fill(cells[i], PALE_BLUE if idx % 2 else "FFFFFF")
            set_cell_border(cells[i])
            set_cell_margins(cells[i])
            p = cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i == 2 else WD_ALIGN_PARAGRAPH.LEFT
            p.add_run(text)
    doc.add_paragraph()


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.7)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.75)
section.right_margin = Inches(0.75)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Arial"
normal.font.size = Pt(11)
normal.font.color.rgb = RGBColor(0, 0, 0)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15

title_style = styles["Title"]
title_style.font.name = "Arial"
title_style.font.size = Pt(26)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor(0, 0, 0)
title_style.paragraph_format.space_after = Pt(10)
title_ppr = title_style.element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

for style_name, size in (("Heading 1", 17), ("Heading 2", 13), ("Heading 3", 11.5)):
    st = styles[style_name]
    st.font.name = "Arial"
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.paragraph_format.space_before = Pt(12)
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.keep_with_next = True

# Header and footer
header = section.header.paragraphs[0]
header.text = "HƯỚNG DẪN SỬ DỤNG  ĐỔI TRẢ PHÔI LỖI"
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
header.runs[0].font.name = "Arial"
header.runs[0].font.size = Pt(8.5)
header.runs[0].font.color.rgb = RGBColor(100, 100, 100)
footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer.add_run("SoHoaBBK  |  Hướng dẫn thêm chi tiết phôi  |  ")
field = OxmlElement("w:fldSimple")
field.set(qn("w:instr"), "PAGE")
footer._p.append(field)
for run in footer.runs:
    run.font.name = "Arial"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(100, 100, 100)

# Cover
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(70)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("SOHOABBK")
r.bold = True
r.font.size = Pt(14)
r.font.color.rgb = RGBColor(47, 117, 181)

p = doc.add_paragraph(style="Title")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run("Hướng dẫn thêm chi tiết phôi trong Đổi trả phôi lỗi")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Tài liệu thao tác dành cho Phòng Kỹ thuật công nghệ B7 và người được phân quyền")
r.font.size = Pt(12)
r.font.color.rgb = RGBColor(89, 89, 89)

doc.add_paragraph()
table = doc.add_table(rows=4, cols=2)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
metadata = [
    ("Phân hệ", "Đổi trả phôi lỗi"),
    ("Chức năng", "Chi tiết phôi theo itemcode"),
    ("Quyền sử dụng", "QUAN_LY_CHI_TIET_PHOI"),
    ("Ngày cập nhật", "28 tháng 11 năm 2026"),
]
for idx, (label, value) in enumerate(metadata):
    for col, text in enumerate((label, value)):
        cell = table.rows[idx].cells[col]
        cell.width = Inches(2.0 if col == 0 else 4.3)
        set_cell_fill(cell, LIGHT_BLUE if col == 0 else "FFFFFF")
        set_cell_border(cell)
        set_cell_margins(cell, 140, 160, 140, 160)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        run = cell.paragraphs[0].add_run(text)
        run.bold = col == 0

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(48)
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Ảnh minh họa sẽ được bổ sung sau tại các vị trí đã đánh dấu trong tài liệu")
r.italic = True
r.font.size = Pt(10)
r.font.color.rgb = RGBColor(100, 100, 100)

doc.add_page_break()

add_heading(doc, "1 Mục đích và phạm vi", 1)
doc.add_paragraph(
    "Tài liệu này hướng dẫn người dùng kiểm tra trạng thái khai báo chi tiết phôi theo itemcode, "
    "thêm một hoặc nhiều loại phôi cho nhiều item cùng lúc, sao chép dữ liệu giữa các item và kiểm tra kết quả sau khi lưu. "
    "Thông tin được dùng làm nguồn chọn phôi trong quy trình Đổi trả phôi lỗi."
)
add_heading(doc, "1.1 Điều kiện sử dụng", 2)
add_bullets(doc, [
    "Tài khoản đã đăng nhập vào hệ thống SoHoaBBK.",
    "Tài khoản có role hoặc permission QUAN_LY_CHI_TIET_PHOI.",
    "Sau khi mới được cấp quyền, người dùng cần đăng xuất và đăng nhập lại.",
    "Itemcode và vật tư cần khai báo đang còn hiệu lực trong danh mục ERP.",
])
add_heading(doc, "1.2 Kết quả cần đạt", 2)
doc.add_paragraph(
    "Mỗi itemcode cần có danh sách vật tư và các loại phôi phù hợp trước khi KCS lập phiếu đổi trả. "
    "Người dùng phải kiểm tra đúng item, vật tư, số phôi và trạng thái phôi in trước khi lưu."
)

add_heading(doc, "2 Truy cập danh sách chi tiết phôi", 1)
add_steps(doc, [
    "Mở menu Đổi trả phôi lỗi.",
    "Chọn tab Chi tiết phôi theo itemcode.",
    "Kiểm tra danh sách itemcode và trạng thái khai báo.",
])
add_image_placeholder(doc, 1, "Tab Chi tiết phôi theo itemcode", "Chụp toàn màn hình trang Đổi trả phôi lỗi và đánh dấu tab Chi tiết phôi theo itemcode")

add_heading(doc, "3 Kiểm tra item đã có hoặc chưa có chi tiết phôi", 1)
doc.add_paragraph(
    "Danh sách hiển thị item mới nhất trước theo ID sản phẩm giảm dần. Mỗi dòng cho biết itemcode, tên sản phẩm, "
    "trạng thái khai báo, số vật tư, số loại phôi và thời điểm cập nhật gần nhất."
)
add_bullets(doc, [
    "Đã có chi tiết phôi nghĩa là item có ít nhất một loại phôi còn hiệu lực.",
    "Chưa có chi tiết phôi nghĩa là item chưa có loại phôi còn hiệu lực và cần được khai báo.",
    "Dùng ô tìm kiếm để tìm theo itemcode hoặc tên sản phẩm.",
    "Dùng bộ lọc Tất cả, Đã có hoặc Chưa có để thu hẹp danh sách.",
])
add_image_placeholder(doc, 2, "Danh sách và trạng thái itemcode", "Chụp bảng danh sách có cả trạng thái Đã có và Chưa có chi tiết phôi")

add_heading(doc, "4 Thêm chi tiết phôi cho itemcode", 1)
add_heading(doc, "4.1 Mở màn khai báo", 2)
add_steps(doc, [
    "Tại item chưa có dữ liệu, chọn Khai báo. Với item đã có dữ liệu, chọn Chi tiết.",
    "Có thể chọn nút Thêm chi tiết phôi ở đầu trang để khai báo mà không cần mở từ một item cụ thể.",
    "Giữ tab Thêm loại phôi trong cửa sổ Thông tin chi tiết phôi.",
])
add_image_placeholder(doc, 3, "Mở cửa sổ khai báo", "Chụp nút Khai báo hoặc Chi tiết trên một dòng itemcode")

add_heading(doc, "4.2 Chọn item và vật tư", 2)
add_steps(doc, [
    "Tại Itemcode áp dụng, chọn một hoặc nhiều item nhận cùng thông tin phôi.",
    "Tại Vật tư, tìm theo mã vật tư hoặc quy cách và chọn đúng vật tư.",
    "Đối chiếu tên sản phẩm và quy cách vật tư trước khi nhập các loại phôi.",
])
doc.add_paragraph(
    "Khi chọn nhiều item, các dòng đang nhập sẽ được áp dụng cho tất cả item đã chọn. Dữ liệu cũ của từng item vẫn được giữ nguyên. "
    "Nếu một item đã có đúng dòng đó, hệ thống bỏ qua dòng trùng và vẫn thêm cho các item còn thiếu."
)
add_image_placeholder(doc, 4, "Chọn nhiều itemcode và một vật tư", "Chụp vùng Itemcode áp dụng và Vật tư sau khi đã chọn dữ liệu")

add_heading(doc, "4.3 Nhập các loại phôi", 2)
add_field_table(doc)
add_steps(doc, [
    "Nhập Tên loại phôi cho dòng đầu tiên.",
    "Nhập các thông tin bổ sung nếu có.",
    "Chọn Thêm dòng khi một vật tư có nhiều loại phôi.",
    "Kiểm tra lại toàn bộ dòng trước khi chọn Lưu.",
])
add_image_placeholder(doc, 5, "Nhập nhiều loại phôi của vật tư", "Chụp tối thiểu hai dòng loại phôi với các trường Tên loại phôi, Số phôi và Phôi in")

add_heading(doc, "4.4 Lưu và kiểm tra kết quả", 2)
doc.add_paragraph(
    "Nút lưu hiển thị số itemcode sẽ được áp dụng. Sau khi lưu, hệ thống thông báo số dòng đã thêm và số dòng trùng bị bỏ qua. "
    "Danh sách Chi tiết hiện có bên dưới được tải lại để người dùng kiểm tra kết quả."
)
add_bullets(doc, [
    "Dòng mới được thêm cho từng item đã chọn.",
    "Dòng trùng không được tạo thêm.",
    "Nếu item hoặc vật tư không hợp lệ, toàn bộ lần lưu bị hủy và không có dữ liệu dở dang.",
])
add_image_placeholder(doc, 6, "Kết quả sau khi lưu", "Chụp thông báo lưu thành công và bảng Chi tiết hiện có")

add_heading(doc, "5 Sao chép chi tiết phôi sang item khác", 1)
doc.add_paragraph(
    "Dùng chức năng sao chép khi item nguồn đã có đầy đủ cấu hình và một hoặc nhiều item đích cần dùng cùng thông tin. "
    "Chức năng này sao chép toàn bộ vật tư và loại phôi còn hiệu lực của item nguồn."
)
add_steps(doc, [
    "Mở cửa sổ Thông tin chi tiết phôi và chọn tab Sao chép sang item khác.",
    "Chọn một itemcode nguồn đã có thông tin phôi.",
    "Chọn một hoặc nhiều itemcode đích.",
    "Kiểm tra danh sách chi tiết của item nguồn.",
    "Chọn Sao chép sang itemcode và chờ thông báo hoàn tất.",
])
doc.add_paragraph(
    "Dữ liệu được gộp vào item đích. Hệ thống không xóa hoặc ghi đè dữ liệu đã có; các dòng trùng được bỏ qua."
)
add_image_placeholder(doc, 7, "Sao chép từ một item sang nhiều item", "Chụp tab Sao chép sang item khác với item nguồn và ít nhất hai item đích")

add_heading(doc, "6 Xem và xóa chi tiết phôi", 1)
add_steps(doc, [
    "Tìm itemcode trong danh sách và chọn Chi tiết.",
    "Xem bảng Chi tiết hiện có, gồm vật tư, loại phôi, dao chặt, số phôi, ký hiệu, phôi in và định mức.",
    "Chỉ chọn biểu tượng Xóa khi chắc chắn dòng không còn được sử dụng.",
    "Xác nhận thao tác xóa và kiểm tra lại danh sách.",
])
doc.add_paragraph(
    "Thao tác xóa chuyển dòng sang trạng thái không còn hiệu lực để giữ lịch sử dữ liệu. Dòng đã xóa không còn xuất hiện trong danh sách chọn phôi của quy trình đổi trả."
)
add_image_placeholder(doc, 8, "Danh sách chi tiết hiện có", "Chụp bảng chi tiết của một item có nhiều vật tư hoặc nhiều loại phôi")

add_heading(doc, "7 Các tình huống thường gặp", 1)
table = doc.add_table(rows=1, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [2.0, 2.35, 2.7]
headers = ["Tình huống", "Nguyên nhân thường gặp", "Cách xử lý"]
for i, h in enumerate(headers):
    cell = table.rows[0].cells[i]
    cell.width = Inches(widths[i])
    set_cell_fill(cell, NAVY)
    set_cell_border(cell)
    set_cell_margins(cell)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr = p.add_run(h)
    rr.bold = True
    rr.font.color.rgb = RGBColor(255, 255, 255)
cases = [
    ("Không thấy tab Chi tiết phôi", "Tài khoản chưa có permission mới hoặc token chưa được làm mới", "Liên hệ quản trị để cấp role QUAN_LY_CHI_TIET_PHOI, sau đó đăng xuất và đăng nhập lại"),
    ("Không tìm thấy itemcode", "Item không còn hiệu lực hoặc từ khóa chưa chính xác", "Kiểm tra lại itemcode trong ERP và tìm bằng một phần mã hoặc tên"),
    ("Không tìm thấy vật tư", "Vật tư không còn hiệu lực hoặc chọn sai mã", "Đối chiếu mã vật tư và quy cách trong ERP"),
    ("Thông báo bỏ qua dòng trùng", "Item đã có cùng vật tư, tên loại phôi, dao chặt, số phôi và ký hiệu", "Không cần nhập lại; mở Chi tiết hiện có để kiểm tra"),
    ("Item thứ hai chưa nhận toàn bộ cấu hình cũ", "Chức năng Thêm chỉ áp dụng các dòng đang nhập", "Dùng tab Sao chép sang item khác để sao chép toàn bộ cấu hình từ item nguồn"),
    ("Không lưu được dữ liệu", "Một item hoặc vật tư không hợp lệ, hoặc thiếu tên loại phôi", "Kiểm tra các trường bắt buộc và thử lại; nếu vẫn lỗi, gửi nội dung thông báo cho quản trị hệ thống"),
]
for idx, row in enumerate(cases):
    cells = table.add_row().cells
    for i, text in enumerate(row):
        cells[i].width = Inches(widths[i])
        cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_fill(cells[i], PALE_BLUE if idx % 2 else "FFFFFF")
        set_cell_border(cells[i])
        set_cell_margins(cells[i], 130, 130, 130, 130)
        body_p = cells[i].paragraphs[0]
        body_p.paragraph_format.line_spacing = 1.0
        body_p.paragraph_format.space_after = Pt(0)
        body_run = body_p.add_run(text)
        body_run.font.size = Pt(9.5)

add_heading(doc, "8 Kiểm tra trước khi hoàn tất", 1)
checks = [
    "Đã chọn đúng itemcode và đúng vật tư",
    "Tên loại phôi rõ ràng và không nhập trùng",
    "Số phôi, ký hiệu, dao chặt và định mức đã được đối chiếu",
    "Đã đánh dấu đúng trường Phôi in",
    "Đã kiểm tra bảng Chi tiết hiện có sau khi lưu hoặc sao chép",
]
for text in checks:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.15)
    p.paragraph_format.space_after = Pt(3)
    p.add_run("☐  ").bold = True
    p.add_run(text)

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Hết tài liệu")
r.bold = True
r.font.color.rgb = RGBColor(89, 89, 89)

doc.save(OUTPUT)
print(OUTPUT)
