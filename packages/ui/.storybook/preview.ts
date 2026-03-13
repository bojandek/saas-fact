import type { Preview } from '@storybook/react';
import '../src/index.css';
import '../src/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FFFFFF' },
        { name: 'dark', value: '#000000' },
        { name: 'surface-light', value: '#F2F2F7' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-white dark:bg-black">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;
