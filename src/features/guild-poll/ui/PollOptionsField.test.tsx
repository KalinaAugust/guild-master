import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PollOptionsField } from './PollOptionsField';

const messages = {
  GuildPoll: {
    optionsLabel: 'Answer options',
    optionPlaceholder: 'Option {index}',
    addOptionPlaceholder: 'Add an option',
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
  it('renders one input per option', () => {
    renderField(['A', 'B', '']);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('grows a trailing slot when the last input gets text', () => {
    const onChange = renderField(['A', '']);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: 'B' } });
    expect(onChange).toHaveBeenCalledWith(['A', 'B', '']);
  });

  it('removes an option via its remove button', () => {
    const onChange = renderField(['A', 'B', '']);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[0]);
    expect(onChange).toHaveBeenCalledWith(['B', '']);
  });
});
