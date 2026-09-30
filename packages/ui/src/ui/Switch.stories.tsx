import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "./Switch";

const meta = {
  title: "Switch",
  component: Switch,
  args: { children: "Notifications" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { defaultSelected: true } };

export const WithDescription: Story = {
  args: { description: "Get an email when someone mentions you." },
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultSelected: true },
};
