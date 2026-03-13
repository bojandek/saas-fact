import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A card container component using design tokens for consistent spacing, borders, and shadows.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="space-y-4">
        <h3 className="text-headline font-semibold">Card Title</h3>
        <p className="text-body text-text-light-secondary">This is a default card with padding and shadow.</p>
      </div>
    ),
  },
};

export const WithHeader: Story = {
  render: () => (
    <Card>
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <h2 className="text-title font-semibold">Card Header</h2>
      </div>
      <div className="p-6">
        <p className="text-body">Card content goes here.</p>
      </div>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <div className="p-6 space-y-4">
        <h3 className="text-headline font-semibold text-primary">Interactive Card</h3>
        <p className="text-body text-text-light-secondary">Hover over this card for a shadow effect.</p>
        <div className="flex gap-2 pt-2">
          <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark">
            Action
          </button>
        </div>
      </div>
    </Card>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark p-8 bg-black">
      <Card>
        <div className="p-6 space-y-4">
          <h3 className="text-headline font-semibold text-primary">Dark Mode Card</h3>
          <p className="text-body text-text-dark-secondary">Cards automatically adapt to dark mode.</p>
        </div>
      </Card>
    </div>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <div>
            <h4 className="font-semibold">Component Title</h4>
            <p className="text-caption text-text-light-tertiary">Subtitle or description</p>
          </div>
        </div>
        <p className="text-body">This card demonstrates using design tokens for typography, spacing, and colors.</p>
      </div>
    </Card>
  ),
};
