import React from "react";
import { PhieuKiemPrintTemplate } from "./PhieuKiemPrintTemplate";

export const DekOfficialPrintTemplate = React.forwardRef((props, ref) => (
    <PhieuKiemPrintTemplate
        ref={ref}
        {...props}
        printVariant="dek-official"
    />
));

DekOfficialPrintTemplate.displayName = "DekOfficialPrintTemplate";
