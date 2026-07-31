'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type FieldType = 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  className?: string;
}

export interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (data: any) => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  defaultValues?: Record<string, any>;
  className?: string;
}

export function FormBuilder({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
  defaultValues = {},
  className = '',
}: FormBuilderProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmitHandler = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className={`space-y-6 ${className}`}>
      {fields.map((field) => (
        <div key={field.name} className={field.className || ''}>
          <Label htmlFor={field.name} className="font-medium text-gray-900">
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
          </Label>

          {field.type === 'select' && (
            <Select
              defaultValue={defaultValues[field.name]}
              onValueChange={(value) => {
                const event = {
                  target: { name: field.name, value },
                } as any;
              }}
            >
              <SelectTrigger id={field.name} className="mt-2">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === 'textarea' && (
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
              })}
              className="mt-2"
            />
          )}

          {['text', 'email', 'number'].includes(field.type) && (
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                pattern:
                  field.type === 'email'
                    ? { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                    : undefined,
              })}
              className="mt-2"
            />
          )}

          {field.type === 'checkbox' && (
            <input
              id={field.name}
              type="checkbox"
              {...register(field.name)}
              className="mt-2 rounded"
            />
          )}

          {errors[field.name] && (
            <span className="text-red-600 text-sm mt-1 block">
              {errors[field.name]?.message as string}
            </span>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={isLoading || isSubmitting}
        className="w-full"
      >
        {isLoading || isSubmitting ? 'Loading...' : submitLabel}
      </Button>
    </form>
  );
}
