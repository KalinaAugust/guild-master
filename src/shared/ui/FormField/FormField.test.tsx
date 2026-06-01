import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as Form from '@radix-ui/react-form';
import { FormField } from './FormField';
import { Input } from '../Input';

const renderInForm = (ui: React.ReactElement) =>
  render(<Form.Root onSubmit={(e) => e.preventDefault()}>{ui}</Form.Root>);

describe('FormField', () => {
  it('renders the label', () => {
    renderInForm(<FormField name="title" label="Title"><Input /></FormField>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderInForm(<FormField name="title" label="Title"><Input placeholder="Enter title" /></FormField>);
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('renders error message when error prop is set', () => {
    renderInForm(<FormField name="title" label="Title" error="Required"><Input /></FormField>);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('does not render error message when error is absent', () => {
    renderInForm(<FormField name="title" label="Title"><Input /></FormField>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
