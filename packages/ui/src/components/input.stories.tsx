import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A text input component with design token styling and focus states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'url'],
      description: 'Input type attribute',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'user@example.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
};

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
    value: 'You cannot edit this',
  },
};

export const WithValue: Story = {
  args: {
    type: 'text',
    value: 'Filled input field',
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark p-8 bg-black space-y-4">
      <Input type="text" placeholder="Light mode placeholder" />
      <Input type="email" placeholder="Dark mode email input" />
    </div>
  ),
};

export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div>
        <label className="block text-sm font-medium mb-2">Valid Input</label>
        <Input type="text" placeholder="Valid state" className="border-success" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Error Input</label>
        <Input type="text" placeholder="Error state" className="border-danger border-2" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Default Input</label>
        <Input type="text" placeholder="Default state" />
      </div>
    </div>
  ),
};
