import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";

const meta = {
  title: "Button",
  component: Button,
  args: { children: "Save" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

export const Quiet: Story = { args: { variant: "quiet", children: "Cancel" } };

export const Disabled: Story = { args: { isDisabled: true } };

export const Pending: Story = { args: { isPending: true } };

/** A long label must not overflow the button. */
export const LongLabel: Story = {
  args: { children: "Save the changes and go back to the list" },
};
