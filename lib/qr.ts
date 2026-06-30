import QRCode from "qrcode";

export async function createQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 220,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
