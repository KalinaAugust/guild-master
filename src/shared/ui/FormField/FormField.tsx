'use client';
import * as React from 'react';
import * as Form from '@radix-ui/react-form';
import styles from './FormField.module.css';

export interface FormFieldProps {
  name: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactElement;
}

export const FormField: React.FC<FormFieldProps> = ({ name, label, error, className, children }) => (
  <Form.Field
    name={name}
    serverInvalid={!!error}
    className={[styles.field, className].filter(Boolean).join(' ')}
  >
    <Form.Label className={styles.label}>{label}</Form.Label>
    <Form.Control asChild>
      {children}
    </Form.Control>
    {error && (
      <Form.Message className={styles.errorMessage}>
        {error}
      </Form.Message>
    )}
  </Form.Field>
);
