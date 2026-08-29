import { forwardRef } from 'react';
import PhieuXuLyKhongPhuHopPrintTemplate from '../../BienBan/components/PhieuXuLyKhongPhuHopPrintTemplate';

const DoiTraPhoiLoiPrintTemplate = forwardRef(function DoiTraPhoiLoiPrintTemplate(
    { data },
    ref
) {
    const phieu = data?.phieu || {};
    const plan = data?.plans?.[0] || {};
    const phoiItems = data?.phoiItems || [];
    const printDefects = phoiItems.flatMap((item) => {
        const objectName = [
            item.TenLoaiPhoi,
            item.SoPhoi ? `Số phôi ${item.SoPhoi}` : '',
            item.KyHieu,
            item.MaVatTu
        ].filter(Boolean).join(' - ');
        const defects = item.defects || [];
        if (!defects.length) {
            return [{
                TenDoiTuong: objectName,
                SoLuongKiem: item.SoLuongKiem,
                SoLuong: item.SoLuongPhoiLoi,
                TenLoiTuNhap: 'Chưa cập nhật nhóm lỗi/lỗi',
                GhiChu: [item.QuyCachVatTu, item.GhiChu].filter(Boolean).join(' - ')
            }];
        }
        return defects.map((defect) => ({
            DefectId: defect.DefectId,
            MaLoi: defect.MaLoi,
            TenLoi: defect.TenLoi,
            DefectType: defect.DefectType,
            MoTa: defect.MoTa,
            TenDoiTuong: objectName,
            SoLuongKiem: item.SoLuongKiem,
            SoLuong: defect.SoLuongLoi,
            GhiChu: [
                defect.TenNhomLoi ? `Nhóm lỗi: ${defect.TenNhomLoi}` : '',
                item.QuyCachVatTu,
                item.GhiChu,
                defect.GhiChu
            ].filter(Boolean).join(' - ')
        }));
    });

    const info = {
        SoBienBan: phieu.SoPhieu,
        SoPhieu: phieu.SoPhieu,
        NgayKiem: phieu.NgayLap,
        CreatedAt: phieu.CreatedAt,
        NguoiLap: phieu.TenNguoiLap,
        MaDonViTaoPhieu: phieu.MaBoPhanKcs,
        DonViTaoPhieu: phieu.TenBoPhanKcs,
        MaBoPhan: plan.DepartmentCode,
        TenBoPhan: plan.DepartmentName,
        MaSanPham: plan.ProductCode,
        TenSanPham: plan.ProductName,
        MaDonHang: plan.OrderCode,
        PhatHienTu: 'TRONG_SAN_XUAT',
        MaLoai: 'DOI_TRA_PHOI_LOI',
        MauPhieuVersion: 'V01',
        MoTaChung: phoiItems.length
            ? `Đổi trả ${phoiItems.length} loại phôi lỗi theo kế hoạch ${plan.PlanNo || plan.PlanID || ''}.`
            : 'Chưa cập nhật danh sách phôi lỗi.',
        PhieuKiemTbpXacNhanAt: phieu.TbpKcsConfirmedAt,
        PhieuKiemTbpXacNhanName: phieu.TenTbpKcsXacNhan
    };

    const dynamicFields = [
        { FieldName: 'TenBoPhan', FieldValue: plan.DepartmentName || '' },
        { FieldName: 'MaBoPhan', FieldValue: plan.DepartmentCode || '' },
        { FieldName: 'TenSanPham', FieldValue: plan.ProductName || '' },
        { FieldName: 'MaSanPham', FieldValue: plan.ProductCode || '' },
        { FieldName: 'MaTruyNguyen', FieldValue: plan.PlanNo || plan.PlanID || '' },
        { FieldName: 'DonHang', FieldValue: plan.OrderCode || '' },
        { FieldName: 'PhatHienTu', FieldValue: 'TRONG_SAN_XUAT' }
    ];

    return (
        <PhieuXuLyKhongPhuHopPrintTemplate
            ref={ref}
            info={info}
            defects={printDefects}
            xuLy={[]}
            chiPhi={[]}
            hanhDong={[]}
            xacNhan={[]}
            phieuKiemXacNhan={[]}
            assigns={[]}
            dynamicFields={dynamicFields}
            specialistOpinions={[]}
            followUpEvaluation={null}
        />
    );
});

export default DoiTraPhoiLoiPrintTemplate;
