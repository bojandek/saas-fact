import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';

const meta = {
  title: 'Components/Label',
  component: Label,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A label component for form inputs with semantic HTML and accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Label Text',
    htmlFor: 'input-1',
  },
};

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="email">Email Address</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="name">
        Full Name <span className="text-danger">*</span>
      </Label>
      <Input id="name" type="text" placeholder="Your full name" required />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" placeholder="Enter a secure password" />
      <p className="text-caption text-text-light-tertiary">Must be at least 8 characters long.</p>
    </div>
  ),
};

export const FormGroup: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          placeholder="Enter your message..."
          className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          rows={4}
        />
      </div>
    </div>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark p-8 bg-black space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dark-input">Dark Mode Label</Label>
        <Input id="dark-input" type="text" placeholder="Dark mode input" />
      </div>
    </div>
  ),
};
