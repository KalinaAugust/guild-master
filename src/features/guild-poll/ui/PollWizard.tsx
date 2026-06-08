'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Switch } from '@/shared/ui/Switch';
import { FormField } from '@/shared/ui/FormField';
import { WizardDialog, WizardColumn } from '@/shared/ui/WizardDialog';
import { useCreatePollMutation } from '@/entities/poll';
import { countFilled, MIN_POLL_OPTIONS } from '../model/options';
import { PollOptionsField } from './PollOptionsField';
import styles from './PollWizard.module.css';

const FORM_ID = 'poll-wizard-form';

interface PollWizardProps {
  open: boolean;
  onClose: () => void;
  guildId: string;
}

export const PollWizard: React.FC<PollWizardProps> = ({ open, onClose, guildId }) => {
  const t = useTranslations('GuildPoll');
  const commonT = useTranslations('Common');
  const [createPoll, { isLoading }] = useCreatePollMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowCustom, setAllowCustom] = useState(false);

  const isValid = title.trim() !== '' && countFilled(options) >= MIN_POLL_OPTIONS;

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setOptions(['']);
    setIsAnonymous(false);
    setAllowMultiple(false);
    setAllowCustom(false);
    onClose();
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    try {
      await createPoll({
        guildId,
        input: { title, description, options, isAnonymous, allowMultiple, allowCustom },
      }).unwrap();
      handleClose();
    } catch {
      toast.error(t('createError'));
    }
  };

  const settings: { key: string; label: string; checked: boolean; onChange: (v: boolean) => void }[] = [
    { key: 'anonymous', label: t('anonymousLabel'), checked: isAnonymous, onChange: setIsAnonymous },
    { key: 'multiple', label: t('multipleLabel'), checked: allowMultiple, onChange: setAllowMultiple },
    { key: 'custom', label: t('customLabel'), checked: allowCustom, onChange: setAllowCustom },
  ];

  return (
    <WizardDialog
      open={open}
      onClose={handleClose}
      title={t('createTitle')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {commonT('cancel')}
          </Button>
          <Button type="submit" variant="primary" form={FORM_ID} disabled={!isValid} isLoading={isLoading}>
            {t('createButton')}
          </Button>
        </>
      }
    >
      <WizardColumn>
        <Form.Root id={FORM_ID} onSubmit={handleSubmit} className={styles.form}>
          <FormField name="title" label={t('nameLabel')} className={styles.formGroup}>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              autoFocus
            />
          </FormField>
          <FormField name="description" label={t('descriptionLabel')} className={styles.formGroup}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </FormField>
          <PollOptionsField value={options} onChange={setOptions} />
        </Form.Root>
      </WizardColumn>

      <WizardColumn>
        <span className={styles.settingsLabel}>{t('settingsLabel')}</span>
        <ul className={styles.settingsList}>
          {settings.map((s) => (
            <li key={s.key} className={styles.settingRow}>
              <span className={styles.settingLabel}>{s.label}</span>
              <Switch checked={s.checked} onCheckedChange={s.onChange} ariaLabel={s.label} />
            </li>
          ))}
        </ul>
      </WizardColumn>
    </WizardDialog>
  );
};
