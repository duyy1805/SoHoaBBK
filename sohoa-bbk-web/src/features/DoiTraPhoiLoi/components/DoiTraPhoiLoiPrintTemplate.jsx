import { forwardRef } from 'react';
import PhieuXuLyKhongPhuHopPrintTemplate from '../../BienBan/components/PhieuXuLyKhongPhuHopPrintTemplate';

const DoiTraPhoiLoiPrintTemplate = forwardRef(function DoiTraPhoiLoiPrintTemplate(
    { data },
    ref
) {
    const phieu = data?.phieu || {};
    const plan = data?.plans?.[0] || {};
    const phoiItems = data?.phoiItems || [];
    const kph = data?.kph || {};
    const responsibleDepartment = [
        phieu.MaBoPhanGayLoiSnapshot,
        phieu.TenBoPhanGayLoiSnapshot,
        phieu.TenDonViGayLoiSnapshot
    ].filter(Boolean).join(' — ');
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
        NguoiLap: phieu.TenKcsHoanTat || phieu.TenNguoiLap,
        NguoiLapSignatureDataUrl: phieu.KcsSignatureDataUrl || phieu.NguoiLapSignatureDataUrl,
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
            ? [
                `Đổi trả ${phoiItems.length} loại phôi lỗi theo kế hoạch ${plan.PlanNo || plan.PlanID || ''}.`,
                responsibleDepartment ? `Bộ phận gây lỗi: ${responsibleDepartment}.` : ''
            ].filter(Boolean).join(' ')
            : 'Chưa cập nhật danh sách phôi lỗi.',
        PhieuKiemTbpXacNhanAt: phieu.TbpKcsConfirmedAt,
        PhieuKiemTbpXacNhanId: phieu.TbpKcsConfirmedBy,
        PhieuKiemTbpXacNhanName: phieu.TenTbpKcsXacNhan,
        PhieuKiemTbpSignatureDataUrl: phieu.TbpKcsSignatureDataUrl,
        CreatorSignatureDataUrl: kph.creatorSignatureDataUrl || null,
        CreatorConfirmedByName: kph.creatorConfirmedByName || null,
        ExecutiveApprovalSignatureDataUrl: [...(kph.executiveApprovals || [])].reverse().find((item) => item.Decision === 'APPROVED')?.SignatureDataUrl || null
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
            xuLy={kph.xuLy || []}
            chiPhi={kph.chiPhi || []}
            hanhDong={kph.hanhDong || []}
            xacNhan={[]}
            phieuKiemXacNhan={[]}
            assigns={[]}
            dynamicFields={dynamicFields}
            specialistOpinions={kph.opinions || []}
            followUpEvaluation={kph.evaluation || null}
        />
    );
});

export default DoiTraPhoiLoiPrintTemplate;
