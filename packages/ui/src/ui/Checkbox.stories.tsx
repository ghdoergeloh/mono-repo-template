import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./Checkbox";

const meta = {
  title: "Checkbox",
  component: Checkbox,
  args: { children: "Send me the newsletter" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultSelected: true } };

export const Indeterminate: Story = { args: { isIndeterminate: true } };

export const WithDescription: Story = {
  args: { description: "At most one email a month." },
};

export const Invalid: Story = {
  args: {
    isRequired: true,
    isInvalid: true,
    children: "I accept the terms",
    errorMessage: "Accept the terms to go on.",
  },
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultSelected: true },
};
