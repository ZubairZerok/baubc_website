import QRCode from 'qrcode';

export async function QR({ value, size = 220 }: { value: string; size?: number }) {
  const svg = await QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#07140E', light: '#FFFFFF' } });
  return <div className="rounded-xl bg-white p-2 inline-block" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="Ticket QR code" role="img" />;
}
