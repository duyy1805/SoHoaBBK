import React from "react";

export function PrintSignatureImage({ src, height = 64, style = {} }) {
    return (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
            {src ? <img src={src} alt="Chữ ký" style={{ display: "block", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : null}
        </div>
    );
}

export default function PrintSignature({
    title, department, name, signedAt, signatureDataUrl, formatDate,
    imageHeight = 64, style = {}, titleStyle = {}, nameStyle = {}
}) {
    const dateText = signedAt && formatDate ? formatDate(signedAt) : signedAt || "";
    return (
        <div style={{ textAlign: "center", ...style }}>
            {dateText ? <div style={{ fontStyle: "italic" }}>{dateText}</div> : null}
            {title ? <div style={{ fontWeight: 700, ...titleStyle }}>{title}</div> : null}
            {department ? <div style={{ fontWeight: 700 }}>{department}</div> : null}
            <PrintSignatureImage src={signatureDataUrl} height={imageHeight} />
            <div style={{ minHeight: 16, fontWeight: 700, ...nameStyle }}>{name || ""}</div>
        </div>
    );
}

