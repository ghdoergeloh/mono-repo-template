import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "./ProgressBar";

const meta = {
  title: "ProgressBar",
  component: ProgressBar,
  args: { label: "Upload" },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Start: Story = { args: { value: 0 } };

export const Half: Story = { args: { value: 50 } };

export const Done: Story = { args: { value: 100 } };

/** Runs forever, so the screenshot comparison skips it. */
export const Indeterminate: Story = {
  args: { isIndeterminate: true },
  parameters: { screenshot: false },
};
