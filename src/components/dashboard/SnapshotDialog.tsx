import { useEffect, useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { canShareImage, downloadBlob } from '@/lib/scheduleSnapshot';
import { useI18n } from '@/i18n';

interface SnapshotDialogProps {
  snapshot: { blob: Blob; fileName: string; title: string } | null;
  onClose: () => void;
}

export function SnapshotDialog({ snapshot, onClose }: SnapshotDialogProps) {
  const { t } = useI18n();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const file = useMemo(
    () => snapshot && new File([snapshot.blob], snapshot.fileName, { type: 'image/png' }),
    [snapshot]
  );
  const shareable = Boolean(file && canShareImage(file));

  useEffect(() => {
    if (!snapshot) return;
    const url = URL.createObjectURL(snapshot.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [snapshot]);

  const share = async () => {
    if (!file || !snapshot) return;
    try {
      await navigator.share({ files: [file], title: snapshot.title });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') downloadBlob(snapshot.blob, snapshot.fileName);
    }
  };

  return (
    <Dialog open={Boolean(snapshot)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md flex-col gap-3 rounded-2xl p-4">
        <DialogHeader>
          <DialogTitle>{t('mobile.snapshot')}</DialogTitle>
          <DialogDescription>{shareable ? t('mobile.snapshotShareHint') : t('mobile.snapshotDownloadHint')}</DialogDescription>
        </DialogHeader>
        {previewUrl && (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-muted/20">
            <img src={previewUrl} alt={snapshot?.title} className="w-full" data-testid="mobile-snapshot-preview" />
          </div>
        )}
        <DialogFooter className="flex-row gap-2 sm:justify-stretch">
          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => snapshot && downloadBlob(snapshot.blob, snapshot.fileName)}>
            <Download className="h-4 w-4" />
            {t('mobile.snapshotDownload')}
          </Button>
          {shareable && (
            <Button type="button" className="flex-1 gap-2" onClick={() => void share()} data-testid="mobile-snapshot-share">
              <Share2 className="h-4 w-4" />
              {t('mobile.snapshotShare')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
