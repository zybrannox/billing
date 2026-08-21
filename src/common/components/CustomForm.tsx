import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, useWatch, Controller, type SubmitHandler } from "react-hook-form";
import { z, ZodType, ZodObject, ZodString } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import { Link } from "react-router-dom";
import FileField from "../.././ui/FileField";
import GmailFileUploader from "../.././ui/GmailFileUploader";
import { type SxProps, type Theme } from "@mui/material/styles";
import CheckboxField, { type Option } from "../.././ui/Checkbox";
import RadioField from "../../ui/RadioField";
import Dropdown, { type DropdownOption } from "../../ui/Dropdown";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import Loader from "../../ui/Loader";
import DateTimePicker from "../../ui/DateTimePicker";

// -----------------------------
// Types
// -----------------------------
export type FieldType =
  | "text"
  | "email"
  | "password"
  | "textarea"
  | "select"
  | "async_select"
  | "number"
  | "file"
  | "file_upload"
  | "date"
  | "date_time"
  | "checkbox"
  | "radio";

export type FieldOption = {
  label: string;
  value: string | number;
  color?: string;
};

export type FieldDefinition = {
  name: string;
  label?: string;
  type: FieldType;
  placeholder?: string;
  multiple?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<string> | FieldOption[] | Option;
  acceptFileType?: string;
  defaultValue?: string | boolean;
  helperText?: string;
  row?: number;
  freeSolo?: boolean; // For dropdown
  disabled?: boolean;
  // For type: "async_select" - server-searched dropdown (see ui/AsyncSearchSelect).
  asyncEndpoint?: string;
  asyncSearchParam?: string;
  asyncExtraParams?: Record<string, string | number>;
  getOptionLabel?: (item: any) => string;
  getOptionValue?: (item: any) => string | number;
  // See AsyncSearchSelect's `initialOption` - lets a caller pre-resolve
  // `defaultValue` to a visible label without a server round-trip.
  initialOption?: any;
};

export type ExternalLink = {
  text: string;
  href: string;
  destination?: "above" | "below";
};

export type CustomFormProps = {
  title?: string;
  fields: FieldDefinition[];
  onSubmit: (data: any) => Promise<void> | void;
  buttonName?: string;
  zodSchema?: ZodObject<any> | null;
  externalLink?: ExternalLink[] | [];
  buttonSx?: SxProps<Theme>;
  loading?: boolean;
  // Fires on every field change with the form's current (unvalidated)
  // values - lets a parent track in-progress state (e.g. files already
  // uploaded to storage) that it needs to act on before submit happens,
  // such as cleaning up orphaned uploads if the form is cancelled.
  onValuesChange?: (values: any) => void;
};

// -----------------------------
// Utility: build dynamic zod schema from fields
// -----------------------------
const buildZodSchema = (fields: FieldDefinition[]) => {
  const shape: Record<string, ZodType> = {};

  fields.forEach((f) => {
    const name = f.name;
    const required = !!f.required;

    let schema: ZodType;

    switch (f.type) {
      case "email": {
        const s = z.email({ message: "Invalid email address" });
        schema = s;
        break;
      }
      case "password":
      case "text":
      case "textarea": {
        let s = z.string();
        if (f.min) s = s.min(f.min, `Minimum ${f.min} characters`);
        if (f.max) s = s.max(f.max, `Maximum ${f.max} characters`);
        schema = s;
        break;
      }
      case "number": {
        let s = z.number();
        if (typeof f.min === "number") s = s.gte(f.min, `Minimum ${f.min}`);
        if (typeof f.max === "number") s = s.lte(f.max, `Maximum ${f.max}`);

        schema = z.preprocess((val) => {
          if (val === "" || val === null || val === undefined) return undefined;
          return Number(val);
        }, s);
        break;
      }
      case "date":
        schema = z.string(); // ISO string
        break;
      case "date_time":
        schema = z.string().datetime({ message: "Invalid date & time" });
        break;

      case "select":
        if (f.multiple) {
          schema = z.array(z.union([z.string(), z.number()]));
        } else {
          schema = z.union([z.string(), z.number()]);
        }
        break;
      case "async_select":
        schema = z.union([z.string(), z.number()]);
        break;
      case "file":
        if (f.multiple) {
          schema = z
            .array(z.instanceof(File))
            .min(1, `${f.label || name} is required`);
        } else {
          schema = z.instanceof(File);
        }
        break;
      case "file_upload":
        // Items are upload-tracking objects ({status, path, ...}), not raw Files.
        // min(1) only applies when the field is actually required - this
        // used to be forced on for any multi-file field, which blocked
        // submitting forms with optional attachments left empty.
        schema =
          f.multiple && required
            ? z.array(z.any()).min(1, `${f.label || name} is required`)
            : z.array(z.any());
        break;
      case "checkbox":
        if (f.options && Array.isArray(f.options) && f.options.length > 0) {
          // Checkbox Group: must be an array of strings
          schema = z.array(z.string()).default([]);
        } else {
          // Single Checkbox: must be a boolean
          schema = z.boolean().default(false);
        }
        break;
      case "radio":
        schema = z.string();
        break;
      default:
        schema = z.any();
    }

    if (required) {
      // ensure empty strings are caught
      if (schema instanceof ZodString) {
        schema = (schema as any).min(1, `${f.label || name} is required`);
      }
      schema = schema.refine(
        (val: any) => val !== undefined && val !== null && val !== "",
        {
          message: `${f.label || name} is required`,
        },
      );
    } else {
      schema = schema.nullish();
    }

    shape[name] = schema;
  });

  return z.object(shape);
};

// -----------------------------
// FormField with proper refs handling
// -----------------------------
const FormField = React.memo(
  ({
    field,
    control,
    errors,
    inputRefs,
    handleEnterFocus,
  }: {
    field: FieldDefinition;
    control: any;
    errors: any;
    inputRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
    handleEnterFocus: (e: React.KeyboardEvent, name: string) => void;
  }) => {
    const name = field.name;
    const error = errors?.[name];

    const setRef = (el: HTMLElement | null) => {
      inputRefs.current[name] = el;
    };

    const onKeyDown = (e: React.KeyboardEvent) => handleEnterFocus(e, name);

    switch (field.type) {
      case "textarea":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? ""}
            render={({ field: ctrlField }) => (
              <TextField
                {...ctrlField}
                inputRef={setRef}
                onKeyDown={onKeyDown}
                placeholder={field.placeholder}
                type={field.type}
                label={renderLabel(field)}
                multiline
                error={!!error}
                helperText={error?.message || field.helperText}
              />
            )}
          />
        );

      case "date":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? ""}
            render={({ field: ctrl }) => (
              <TextField
                {...ctrl}
                type="date"
                label={renderLabel(field)}
                error={!!error}
                helperText={error?.message}
              />
            )}
          />
        );

      case "date_time":
        return (
          <Controller
            name={name}
            control={control}
            render={({ field: ctrl }) => (
              <DateTimePicker
                label={renderLabel(field)}
                value={ctrl.value}
                onChange={ctrl.onChange}
                error={!!error}
                helperText={error?.message || field.helperText}
                disabled={field.disabled}
              />
            )}
          />
        );

      case "number":
      case "text":
      case "email":
      case "password":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? ""}
            render={({ field: ctrlField }) => (
              <TextField
                {...ctrlField}
                inputRef={setRef}
                onKeyDown={onKeyDown}
                placeholder={field.placeholder}
                type={field.type}
                label={renderLabel(field)}
                error={!!error}
                helperText={error?.message || field.helperText}
                disabled={field.disabled}
              />
            )}
          />
        );

      case "file":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? null}
            render={({ field: ctrlField }) => (
              <FileField
                {...ctrlField}
                ref={setRef}
                label={renderLabel(field)}
                accept={field.acceptFileType}
                multiple={field.multiple}
                error={error?.message}
                helperText={field.helperText}
              />
            )}
          />
        );

      case "file_upload":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? []}
            render={({ field: ctrlField }) => (
              <GmailFileUploader
                value={ctrlField.value}
                onChange={ctrlField.onChange}
                label={renderLabel(field)}
                accept={field.acceptFileType}
                multiple={field.multiple}
                error={error?.message}
                helperText={field.helperText}
              />
            )}
          />
        );

      case "checkbox":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.options ? [] : false}
            render={({ field: ctrl }) => (
              <CheckboxField
                value={ctrl.value}
                label={renderLabel(field)}
                options={field.options as Option[]}
                error={errors?.[name]?.message}
                onChange={ctrl.onChange}
              />
            )}
          />
        );

      case "radio":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={(field.options as any)?.[0]?.value || ""}
            render={({ field: ctrl }) => (
              <RadioField
                value={ctrl.value}
                label={renderLabel(field)}
                options={field.options as Option[]}
                error={errors?.[name]?.message}
                onChange={ctrl.onChange}
              />
            )}
          />
        );

      case "select":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? (field.multiple ? [] : "")}
            render={({ field: ctrl }) => (
              <Dropdown
                label={renderLabel(field)}
                options={field.options as DropdownOption[]}
                multiple={field.multiple}
                value={ctrl.value}
                onChange={ctrl.onChange}
                placeholder={field.placeholder}
                freeSolo={field.freeSolo}
                disabled={field.disabled}
                error={!!error}
                helperText={error?.message || field.helperText}
                sx={{ width: "100%" }}
              />
            )}
          />
        );

      case "async_select":
        return (
          <Controller
            name={name}
            control={control}
            defaultValue={field.defaultValue ?? ""}
            render={({ field: ctrl }) => (
              <AsyncSearchSelect
                label={renderLabel(field)}
                placeholder={field.placeholder}
                endpoint={field.asyncEndpoint!}
                searchParam={field.asyncSearchParam}
                extraParams={field.asyncExtraParams}
                getOptionLabel={field.getOptionLabel!}
                getOptionValue={field.getOptionValue!}
                value={ctrl.value}
                onChange={ctrl.onChange}
                disabled={field.disabled}
                initialOption={field.initialOption}
                error={!!error}
                helperText={error?.message || field.helperText}
              />
            )}
          />
        );
      default:
        return null;
    }
  },
);

FormField.displayName = "FormField";

const renderLabel = (field: FieldDefinition): React.ReactNode => {
  if (!field.label) return field.label;
  if (!field.required) return field.label;
  return (
    <>
      {field.label} <span style={{ color: "#ef4444" }}>*</span>
    </>
  );
};

export default function CustomForm({
  fields,
  onSubmit,
  buttonName = "Submit",
  externalLink,
  buttonSx,
  zodSchema = null,
  loading,
  onValuesChange,
}: CustomFormProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const renderLinks = useCallback(
    (destination: "above" | "below") => {
      if (!externalLink) return null;
      return (
        <div
          className={`flex ${
            destination === "above"
              ? "justify-end mb-4"
              : "justify-start mt-4 space-x-2"
          }`}
        >
          {externalLink
            .filter((link) => link.destination === destination)
            .map((link, index) =>
              destination === "above" ? (
                <Link
                  key={index}
                  to={link.href}
                  className="text-blue-500 hover:underline text-sm font-medium"
                >
                  {link.text}
                </Link>
              ) : (
                <Button
                  key={index}
                  onClick={() => (window.location.href = link.href)}
                  sx={{
                    background: "#181f4a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  {link.text}
                </Button>
              ),
            )}
        </div>
      );
    },
    [externalLink],
  );
  // build or use provided zod schema
  const schema = useMemo(
    () => zodSchema ?? buildZodSchema(fields),
    [fields, zodSchema],
  );

  type SchemaType = z.infer<typeof schema>;

  const { control, handleSubmit, formState } = useForm<SchemaType>({
    resolver: zodResolver(schema as any),
    defaultValues: useMemo(
      () =>
        fields.reduce(
          (acc, f) => ({ ...acc, [f.name]: f.defaultValue ?? undefined }),
          {} as Record<string, any>,
        ),
      [fields],
    ),
  });

  const { errors, isSubmitting } = formState;

  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Form Validation Errors:", errors);
    }
  }, [errors]);

  const watchedValues = useWatch({ control });
  useEffect(() => {
    onValuesChange?.(watchedValues);
    // onValuesChange isn't included - it's expected to be a stable
    // callback (e.g. writing into a ref), and including it would re-fire
    // this on every parent re-render rather than only on value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues]);

  const handleEnterFocus = (e: React.KeyboardEvent, name: string) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const focusable = fields
      .filter((f) => ["text", "email", "password", "number"].includes(f.type))
      .map((f) => f.name);

    const idx = focusable.indexOf(name);
    const next = focusable[idx + 1];
    if (next) inputRefs.current[next]?.focus();
  };

  const submitHandler: SubmitHandler<SchemaType> = useCallback(
    async (data) => {
      console.log("Final form data:", data);
      await onSubmit(data);
    },
    [onSubmit],
  );

  const rows = fields.reduce(
    (acc, f) => {
      if (f.row) {
        if (!acc[f.row]) acc[f.row] = [];
        acc[f.row].push(f);
      }
      return acc;
    },
    {} as Record<number, FieldDefinition[]>,
  );

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      <div className="p-5">
        <div className="flex flex-col gap-4">
          {fields.map((field) => {
            // If field is part of a row group, skip here (we will render it later)
            if (field.row) return null;

            return (
              <FormField
                key={field.name}
                field={field}
                control={control}
                errors={errors}
                inputRefs={inputRefs}
                handleEnterFocus={handleEnterFocus}
              />
            );
          })}

          {/* Render all rows */}
          {Object.keys(rows).map((rowKey) => (
            <div key={rowKey} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rows[+rowKey].map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  control={control}
                  errors={errors}
                  inputRefs={inputRefs}
                  handleEnterFocus={handleEnterFocus}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {renderLinks("above")}
      <div className="flex justify-end px-5 pb-5">
        <Button
          sx={buttonSx}
          type="submit"
          disabled={isSubmitting}
          size="medium"
          variant="contained"
        >
          {isSubmitting || loading ? <Loader /> : buttonName}
        </Button>
      </div>
      {renderLinks("below")}
    </form>
  );
}
