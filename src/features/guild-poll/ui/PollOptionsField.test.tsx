import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PollOptionsField } from './PollOptionsField';

const messages = {
  GuildPoll: {
    optionsLabel: 'Answer options',
    optionPlaceholder: 'Option {index}',
    addOptionButton: 'Add an option',
    removeOption: 'Remove option',
  },
};

const renderField = (value: string[], onChange = vi.fn()) => {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PollOptionsField value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
};

describe('PollOptionsField', () => {
  it('renders only the add button when there are no options', () => {
    renderField([]);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add an option' })).toBeInTheDocument();
  });

  it('renders one input per option', () => {
    renderField(['A', 'B']);
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('appends an empty option when the add button is clicked', () => {
    const onChange = renderField(['A']);
    fireEvent.click(screen.getByRole('button', { name: 'Add an option' }));
    expect(onChange).toHaveBeenCalledWith(['A', '']);
  });

  it('removes an option via its remove button', () => {
    const onChange = renderField(['A', 'B']);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[0]);
    expect(onChange).toHaveBeenCalledWith(['B']);
  });

  it('hides the add button at the max of 10 options', () => {
    renderField(Array.from({ length: 10 }, (_, i) => `O${i}`));
    expect(screen.queryByRole('button', { name: 'Add an option' })).not.toBeInTheDocument();
  });
});
