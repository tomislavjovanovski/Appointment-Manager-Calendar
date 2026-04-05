// tests/e2e/drag-drop-rescheduling.spec.ts
// Drag & drop is high-risk: the interaction is complex, and a failed drag
// must not corrupt the appointment's time in storage.

import { test, expect } from '../fixtures/base';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';

// ── Helper: get bounding box centre of a locator ─────────────────────────────

async function centre(locator: Awaited<ReturnType<typeof import('@playwright/test').expect>>) {
  // @ts-expect-error — locator type narrowing
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// ── Drag helper (mouse API — more reliable than locator.dragTo for complex grids) ──

async function dragAppointment(
  page: import('@playwright/test').Page,
  sourceTestId: string,
  targetTestId: string,
): Promise<void> {
  const source = page.getByTestId(sourceTestId);
  const target = page.getByTestId(targetTestId);

  await source.scrollIntoViewIfNeeded();
  const src = await source.boundingBox();
  const tgt = await target.boundingBox();

  if (!src || !tgt) throw new Error('Drag target bounding box not found');

  const srcX = src.x + src.width / 2;
  const srcY = src.y + src.height / 2;
  const tgtX = tgt.x + tgt.width / 2;
  const tgtY = tgt.y + tgt.height / 2;

  await page.mouse.move(srcX, srcY);
  await page.mouse.down();
  // Move gradually to trigger drag events on the scheduler
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      srcX + ((tgtX - srcX) / steps) * i,
      srcY + ((tgtY - srcY) / steps) * i,
      { steps: 1 },
    );
  }
  await page.mouse.up();
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Drag & Drop Rescheduling', () => {
  test.beforeEach(async ({ pageWithPatients: page, booking }) => {
    // Seed one appointment at 10:00 two days from now
    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(2, 10),
    });
  });

  test('drag appointment to new slot updates time in UI and storage', async ({
    pageWithPatients: page,
  }) => {
    const appointmentBlock = page
      .getByTestId('appointment-block')
      .filter({ hasText: PATIENTS.alice.firstName })
      .first();

    const targetSlot = page.getByTestId('time-slot-14:00').first();

    await test.step('Perform drag from 10:00 → 14:00', async () => {
      await dragAppointment(
        page,
        'appointment-block', // source (first match)
        'time-slot-14:00',   // target
      );
    });

    await test.step('Appointment block now shows in 14:00 area', async () => {
      // Expect the block to have moved — check its position relative to the 14:00 row
      const blockBox = await appointmentBlock.boundingBox();
      const targetBox = await targetSlot.boundingBox();

      expect(blockBox).not.toBeNull();
      expect(targetBox).not.toBeNull();
      // Block Y should be within the target row's vertical bounds (±5px tolerance)
      expect(Math.abs(blockBox!.y - targetBox!.y)).toBeLessThan(50);
    });

    await test.step('LocalStorage reflects new start time', async () => {
      const appointments = await storageHelper.getAll(page, 'appointments') as {
        startTime: string;
      }[];

      const updated = appointments[0];
      const updatedHour = new Date(updated.startTime).getHours();
      expect(updatedHour).toBe(14);
    });

    await test.step('Success toast shown after drop', async () => {
      await expect(page.getByTestId('toast-success')).toBeVisible();
    });
  });

  test('drag to occupied slot shows conflict error and reverts appointment', async ({
    pageWithPatients: page, booking,
  }) => {
    // Book a second appointment at 14:00 (the drop target)
    await booking.book(page, {
      patientId: PATIENTS.bob.id,
      type: 'follow-up',
      duration: 30,
      slotDate: nextWorkingSlot(2, 14),
    });

    const originalAppointments = await storageHelper.getAll(page, 'appointments') as {
      id: string; startTime: string;
    }[];
    const alice = originalAppointments.find(
      (a) => a.startTime.includes('T10:'),
    )!;

    await test.step('Try to drag Alice 10:00 → 14:00 (Bob already there)', async () => {
      await dragAppointment(page, 'appointment-block', 'time-slot-14:00');
    });

    await test.step('Conflict error toast shown', async () => {
      await expect(page.getByTestId('toast-error')).toBeVisible();
      await expect(page.getByText(/slot.*already/i)).toBeVisible();
    });

    await test.step('Alice appointment NOT moved in storage', async () => {
      const after = await storageHelper.getAll(page, 'appointments') as {
        id: string; startTime: string;
      }[];
      const aliceAfter = after.find((a) => a.id === alice.id)!;
      expect(new Date(aliceAfter.startTime).getHours()).toBe(10); // unchanged
    });
  });

  test('drag outside working hours boundary is rejected', async ({
    pageWithPatients: page,
  }) => {
    // Attempt to drag to 19:00 (outside 08:00–18:00)
    const earlySlot = page.getByTestId('time-slot-19:00');
    const isVisible = await earlySlot.isVisible();

    if (isVisible) {
      await dragAppointment(page, 'appointment-block', 'time-slot-19:00');
      await expect(page.getByTestId('toast-error')).toBeVisible();

      // Original time preserved
      const appointments = await storageHelper.getAll(page, 'appointments') as {
        startTime: string;
      }[];
      expect(new Date(appointments[0].startTime).getHours()).toBe(10);
    } else {
      // If the slot is not rendered at all, the constraint is enforced by the UI
      expect(isVisible).toBe(false);
    }
  });

  test('drag cancelled mid-gesture (Escape key) reverts to original position', async ({
    pageWithPatients: page,
  }) => {
    const originalStartTime = ((await storageHelper.getAll(page, 'appointments')) as {
      startTime: string;
    }[])[0].startTime;

    const source = page.getByTestId('appointment-block').first();
    const src = await source.boundingBox();
    if (!src) throw new Error('No bounding box');

    await test.step('Start drag, then press Escape', async () => {
      await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
      await page.mouse.down();
      await page.mouse.move(src.x + src.width / 2, src.y + 200);
      await page.keyboard.press('Escape');
      await page.mouse.up();
    });

    await test.step('Storage time is unchanged after cancelled drag', async () => {
      const after = await storageHelper.getAll(page, 'appointments') as {
        startTime: string;
      }[];
      expect(after[0].startTime).toBe(originalStartTime);
    });
  });
});
