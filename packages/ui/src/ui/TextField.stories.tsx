import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "./TextField";

const meta = {
  title: "TextField",
  component: TextField,
  args: { label: "Name" },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { defaultValue: "Ada Example" } };

export const WithDescription: Story = {
  args: { description: "As it appears on the invoice." },
};

export const Invalid: Story = {
  args: {
    defaultValue: "a",
    isInvalid: true,
    errorMessage: "Enter at least two characters.",
  },
};

export const Disabled: Story = {
  args: { defaultValue: "Ada Example", isDisabled: true },
};

/** A long value stays inside the field. */
export const LongValue: Story = {
  args: {
    defaultValue:
      "A very long name that does not fit into the field and must not push the layout",
  },
};
