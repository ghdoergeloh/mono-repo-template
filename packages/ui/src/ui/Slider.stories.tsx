import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Slider } from "./Slider";

/**
 * Checks that each thumb sits where its value is on the track. A thumb
 * that is off by half a step looks fine in a single story at the middle;
 * the stories at the minimum and the maximum show it.
 */
async function thumbsMatchValues({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const track = canvasElement.querySelector<HTMLElement>(
    "[data-orientation] > div:last-child",
  );
  const sliders =
    canvasElement.querySelectorAll<HTMLInputElement>("input[type=range]");
  await expect(track).not.toBeNull();
  const box = track?.getBoundingClientRect();
  for (const input of sliders) {
    // The input is visually hidden inside the thumb, which React Aria
    // places with an inline `left`.
    const thumb = input
      .closest<HTMLElement>("[style*='left']")
      ?.getBoundingClientRect();
    await expect(thumb).toBeDefined();
    if (!box || !thumb) continue;
    const share =
      (Number(input.value) - Number(input.min)) /
      (Number(input.max) - Number(input.min));
    const center = thumb.left + thumb.width / 2;
    await expect(
      Math.abs(center - (box.left + share * box.width)),
    ).toBeLessThan(1.5);
  }
}

const meta = {
  title: "Slider",
  component: Slider<number>,
  args: { label: "Volume", thumbLabels: ["Volume"] },
  play: thumbsMatchValues,
} satisfies Meta<typeof Slider<number>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Minimum: Story = { args: { defaultValue: 0 } };

export const Middle: Story = { args: { defaultValue: 50 } };

export const Maximum: Story = { args: { defaultValue: 100 } };

/** A scale from 1 to 5: the values do not start at zero. */
export const Steps: Story = {
  args: { minValue: 1, maxValue: 5, step: 1, defaultValue: 4 },
};

export const Disabled: Story = { args: { defaultValue: 30, isDisabled: true } };
