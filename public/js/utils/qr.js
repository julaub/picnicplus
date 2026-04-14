// js/utils/qr.js
export const generateQRCodeUrl = (data) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
};
