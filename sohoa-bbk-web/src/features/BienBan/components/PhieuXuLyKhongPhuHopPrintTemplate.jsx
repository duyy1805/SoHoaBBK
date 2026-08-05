import React from "react";
import { BienBanPrintTemplate } from "./BienBanPrintTemplate";

export const PhieuXuLyKhongPhuHopPrintTemplate = React.forwardRef((props, ref) => {
    const normalizedDefects = (props.defects || []).map((item) => ({
        ...item,
        TenLoi: item.TenLoi || item.TenLoiTuNhap || item.MoTa || "",
        SoLuongKiem: item.SoLuongKiem ?? ""
    }));

    return (
        <BienBanPrintTemplate
            ref={ref}
            {...props}
            defects={normalizedDefects}
            useDefectInspectedQuantityOnly
        />
    );
});

export default PhieuXuLyKhongPhuHopPrintTemplate;
