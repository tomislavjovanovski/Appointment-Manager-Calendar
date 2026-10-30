export type SnapshotItem =
  | { kind: 'appointment'; start: string; end: string; count: number }
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
  bookedLabel: (count: number) => string;
}

const WIDTH = 540;
const SCALE = 2;
const PAD = 20;
const ROW = 44;
const BUSY_ROW = 24;
const GAP = 8;
const DAY_HEADER = 52;
const DAY_GAP = 18;
const HEADER = 72;

export function groupSnapshotItems(items: SnapshotItem[]): SnapshotItem[] {
  const grouped: SnapshotItem[] = [];
  for (const item of [...items].sort((a, b) => a.start.localeCompare(b.start))) {
    const previous = grouped[grouped.length - 1];
    if (item.kind === 'appointment' && previous?.kind === 'appointment' && item.start <= previous.end) {
      previous.end = previous.end > item.end ? previous.end : item.end;
      previous.count += item.count;
    } else {
      grouped.push({ ...item });
    }
  }
  return grouped;
}

const rowHeight = (item: SnapshotItem) => item.kind === 'free' ? ROW : BUSY_ROW;

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

export async function createScheduleSnapshot({ title, days, freeLabel, blockedLabel, bookedLabel }: SnapshotOptions): Promise<Blob> {
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const primary = cssColor('--primary', '#0070f0');
  const destructive = cssColor('--destructive', '#ef4444');
  const foreground = cssColor('--foreground', '#0f172a');
  const muted = cssColor('--muted-foreground', '#64748b');
  const border = cssColor('--border', '#e2e8f0');

  const groupedDays = days.map((day) => ({ ...day, items: groupSnapshotItems(day.items) }));
  const dayHeight = (day: SnapshotDay) =>
    DAY_HEADER + (day.items.length ? day.items.reduce((sum, item) => sum + rowHeight(item) + GAP, -GAP) : ROW);
  const height = HEADER + groupedDays.reduce((sum, day) => sum + dayHeight(day) + DAY_GAP, 0) + PAD - DAY_GAP;

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
  const rowWidth = WIDTH - PAD * 2;
  for (const day of groupedDays) {
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
      if (item.kind !== 'free') {
        const label = `${time} · ${item.kind === 'appointment' ? bookedLabel(item.count) : blockedLabel}`;
        const centerY = y + BUSY_ROW / 2;
        ctx.font = `500 12px ${font}`;
        const labelWidth = ctx.measureText(label).width;
        const labelX = (WIDTH - labelWidth) / 2;
        ctx.strokeStyle = border;
        ctx.beginPath();
        ctx.moveTo(PAD, centerY);
        ctx.lineTo(Math.max(PAD, labelX - 10), centerY);
        ctx.moveTo(Math.min(WIDTH - PAD, labelX + labelWidth + 10), centerY);
        ctx.lineTo(WIDTH - PAD, centerY);
        ctx.stroke();
        ctx.fillStyle = item.kind === 'blocked' ? destructive : muted;
        ctx.fillText(label, labelX, centerY);
        y += BUSY_ROW + GAP;
        continue;
      }

      roundRect(ctx, PAD, y, rowWidth, ROW, 12);
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = primary;
      ctx.fill();
      ctx.restore();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = primary;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = primary;
      ctx.font = `600 14px ${font}`;
      ctx.fillText(time, PAD + 16, y + ROW / 2);
      ctx.font = `500 13px ${font}`;
      ctx.fillText(freeLabel, PAD + 156, y + ROW / 2);
      y += ROW + GAP;
    }
    y += DAY_GAP - GAP;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create image');
  return blob;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareImage(file: File) {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}
