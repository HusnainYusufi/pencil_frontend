import "server-only";
import QRCode from "qrcode";

/**
 * Renders a QR payload server-side as an SVG data URL (allowed by the CSP's
 * img-src). The payload is the TLV base64 string ZATCA readers expect.
 */
export async function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const svg = await QRCode.toString(value, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  // eslint-disable-next-line @next/next/no-img-element -- data URL, no optimisation needed
  return <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} alt={label} className={className} />;
}
