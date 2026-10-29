export type SnapshotItem =
  | { kind: 'appointment'; start: string; end: string; color: string }
  | { kind: 'free'; start: string; end: string }
  | { kind: 'blocked'; start: string; end: string };

export interface SnapshotDay {
  title: string;
  subtitle: string;
  items: SnapshotItem[];
  emptyLabel?: string;
}

export interface SnapshotOptions {
  title: string;
  days: SnapshotDay[];
  freeLabel: string;
  blockedLabel: string;
  fileName: string;
}

const WIDTH = 540;
const SCALE = 2;
const PAD = 20;
const ROW = 44;
const GAP = 8;
const DAY_HEADER = 52;
const DAY_GAP = 18;
const HEADER = 72;

// Real names are never drawn; a placeholder is blurred so no patient data ends up in the image.
const PLACEHOLDERS = ['Xxxxxx Xxxxxxxx', 'Xxxx Xxxxxxxxxx', 'Xxxxxxxx Xxxxx', 'Xxxxx Xxxxxxx'];

const cssColor = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export async function downloadScheduleSnapshot({ title, days, freeLabel, blockedLabel, fileName }: SnapshotOptions) {
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const primary = cssColor('--primary', '#0070f0');
  const destructive = cssColor('--destructive', '#ef4444');
  const foreground = cssColor('--foreground', '#0f172a');
  const muted = cssColor('--muted-foreground', '#64748b');
  const border = cssColor('--border', '#e2e8f0');

  const dayHeight = (day: SnapshotDay) =>
    DAY_HEADER + Math.max(day.items.length, 1) * (ROW + GAP) - GAP;
  const height = HEADER + days.reduce((sum, day) => sum + dayHeight(day) + DAY_GAP, 0) + PAD - DAY_GAP;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = foreground;
  ctx.font = `700 22px ${font}`;
  ctx.fillText(title, PAD, 38);

  let y = HEADER;
  let placeholder = 0;
  const rowWidth = WIDTH - PAD * 2;
  for (const day of days) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 0.5);
    ctx.lineTo(WIDTH - PAD, y + 0.5);
    ctx.stroke();

    ctx.fillStyle = foreground;
    ctx.font = `600 16px ${font}`;
    ctx.fillText(day.title, PAD, y + 20);
    ctx.fillStyle = muted;
    ctx.font = `400 12px ${font}`;
    ctx.fillText(day.subtitle, PAD, y + 39);
    y += DAY_HEADER;

    if (day.items.length === 0) {
      roundRect(ctx, PAD, y, rowWidth, ROW, 12);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.font = `500 13px ${font}`;
      ctx.fillText(day.emptyLabel ?? '', PAD + 14, y + ROW / 2);
      y += ROW + DAY_GAP;
      continue;
    }

    for (const item of day.items) {
      const time = `${item.start} - ${item.end}`;
      roundRect(ctx, PAD, y, rowWidth, ROW, 12);
      if (item.kind === 'free') {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = primary;
        ctx.fill();
        ctx.restore();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = primary;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (item.kind === 'blocked') {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = destructive;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.stroke();
        ctx.save();
        roundRect(ctx, PAD, y, rowWidth, ROW, 12);
        ctx.clip();
        ctx.fillStyle = item.color;
        ctx.fillRect(PAD, y, 5, ROW);
        ctx.restore();
      }

      const textColor = item.kind === 'free' ? primary : item.kind === 'blocked' ? destructive : foreground;
      ctx.fillStyle = textColor;
      ctx.font = `600 14px ${font}`;
      ctx.fillText(time, PAD + 16, y + ROW / 2);

      const labelX = PAD + 136;
      if (item.kind === 'appointment') {
        // Shadow-only rendering gives a blur that also works in browsers without ctx.filter.
        ctx.save();
        ctx.font = `600 14px ${font}`;
        ctx.fillStyle = '#000';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.75)';
        ctx.shadowBlur = 7 * SCALE;
        ctx.shadowOffsetX = 10000 * SCALE;
        ctx.fillText(PLACEHOLDERS[placeholder++ % PLACEHOLDERS.length], labelX - 10000, y + ROW / 2);
        ctx.restore();
      } else {
        ctx.fillStyle = textColor;
        ctx.font = `500 13px ${font}`;
        ctx.fillText(item.kind === 'free' ? freeLabel : blockedLabel, labelX, y + ROW / 2);
      }
      y += ROW + GAP;
    }
    y += DAY_GAP - GAP;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create image');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
