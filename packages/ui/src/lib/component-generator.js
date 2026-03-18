"use strict";
/**
 * Nano Banana Component Generator
 * Automatically generates React components based on design system and theme
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NanoBananaComponentGenerator = void 0;
class NanoBananaComponentGenerator {
    /**
     * Generate a form component based on theme
     */
    static generateFormComponent(config) {
        const { componentName, theme, properties } = config;
        const code = `
import React from 'react';
import { cn } from '@/lib/utils';

interface ${componentName}Props {
  ${properties?.fields?.map((f) => `${f.name}?: string;`).join('\n  ')}
  onSubmit?: (data: any) => void;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  ${properties?.fields?.map((f) => f.name).join(', ')}
  onSubmit,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({
      ${properties?.fields?.map((f) => `${f.name}`).join(',\n      ')}
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      ${properties?.fields?.map((f) => `
      <div>
        <label className="block text-sm font-medium mb-2">${f.label}</label>
        <input
          type="${f.type || 'text'}"
          name="${f.name}"
          className="w-full px-3 py-2 border rounded-${theme.borderRadius} focus:outline-none focus:ring-2"
          style={{ '--focus-color': '${theme.accentColor}' } as any}
        />
      </div>
      `).join('\n')}
      <button
        type="submit"
        className="w-full py-2 rounded-${theme.borderRadius} font-medium text-white transition"
        style={{ backgroundColor: '${theme.primaryColor}' }}
      >
        Submit
      </button>
    </form>
  );
};
    `;
        const styles = `
.${componentName} {
  font-family: ${theme.fontFamily};
  border-radius: ${theme.borderRadius};
}

.${componentName} input {
  border-color: #e5e7eb;
  transition: all 0.2s;
}

.${componentName} input:focus {
  border-color: ${theme.accentColor};
  box-shadow: 0 0 0 3px rgba(${this.hexToRgb(theme.accentColor)}, 0.1);
}

.${componentName} button {
  background-color: ${theme.primaryColor};
}

.${componentName} button:hover {
  opacity: 0.9;
}
    `;
        return {
            name: componentName,
            code: code.trim(),
            styles: styles.trim(),
            props: properties?.fields?.reduce((acc, f) => {
                acc[f.name] = f.type || 'string';
                return acc;
            }, {}) || {},
        };
    }
    /**
     * Generate a card component
     */
    static generateCardComponent(config) {
        const { componentName, theme } = config;
        const code = `
import React from 'react';

interface ${componentName}Props {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="rounded-${theme.borderRadius} border shadow-sm p-6" style={{ borderColor: '#e5e7eb' }}>
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {description && <p className="text-gray-600 text-sm mb-4">{description}</p>}
      {children}
    </div>
  );
};
    `;
        return {
            name: componentName,
            code: code.trim(),
            styles: '',
            props: { title: 'string', description: 'string', children: 'ReactNode' },
        };
    }
    /**
     * Generate a button component
     */
    static generateButtonComponent(config) {
        const { componentName, theme } = config;
        const code = `
import React from 'react';
import { cn } from '@/lib/utils';

interface ${componentName}Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-${theme.borderRadius} transition-all';
  
  const variantStyles = {
    primary: 'bg-[${theme.primaryColor}] text-white hover:opacity-90',
    secondary: 'bg-[${theme.secondaryColor}] text-white hover:opacity-90',
    outline: 'border-2 border-[${theme.accentColor}] text-[${theme.accentColor}] hover:bg-[${theme.accentColor}] hover:text-white',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
    `;
        return {
            name: componentName,
            code: code.trim(),
            styles: '',
            props: { variant: 'string', size: 'string' },
        };
    }
    /**
     * Helper function to convert hex to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    }
    /**
     * Generate multiple components for a SaaS
     */
    static generateComponentLibrary(theme, components) {
        return components.map(comp => {
            const config = {
                componentName: comp.name,
                componentType: comp.type,
                theme,
            };
            switch (comp.type) {
                case 'form':
                    return this.generateFormComponent(config);
                case 'card':
                    return this.generateCardComponent(config);
                case 'button':
                    return this.generateButtonComponent(config);
                default:
                    return this.generateCardComponent(config);
            }
        });
    }
}
exports.NanoBananaComponentGenerator = NanoBananaComponentGenerator;
//# sourceMappingURL=component-generator.js.map