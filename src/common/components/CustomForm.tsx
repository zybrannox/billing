import React, { useCallback, useMemo, useRef } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { z, ZodType, ZodObject, ZodString } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import { Link } from "react-router-dom";
import { MenuItem } from "@mui/material";
import FileField from "../.././ui/FileField";
import GmailFileUploader from "../.././ui/GmailFileUploader";
import { useAppStore } from "../../store/useAppStore";
import { type SxProps, type Theme } from "@mui/material/styles";
import CheckboxField, { type Option } from "../.././ui/Checkbox";
import RadioField from "../../ui/RadioField";
import Dropdown from "../../ui/Dropdown";
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
};

export type ExternalLink = {
  text: string;
  href: string;
  destination?: "above" | "below";
};

export type CustomFormProps<T extends ZodType = ZodType> = {
  title?: string;
  fields: FieldDefinition[];
  onSubmit: (data: any) => Promise<void> | void;
  buttonName?: string;
  zodSchema?: ZodObject<any> | null;
  externalLink?: ExternalLink[] | [];
  buttonSx?: SxProps<Theme>;
  loading?: boolean;
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
        schema = f.multiple
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
    register,
    errors,
    inputRefs,
    handleEnterFocus,
  }: {
    field: FieldDefinition;
    control: any;
    register: any;
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
                type={field.type}
                label={field.label}
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
                label={field.label}
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
                label={field.label}
                value={ctrl.value}
                onChange={ctrl.onChange}
                error={!!error}
                helperText={error?.message}
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
                label={field.label}
                error={!!error}
                helperText={error?.message || field.helperText}
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
                label={field.label}
                accept={field.acceptFileType}
                multiple={field.multiple}
                error={!!error}
                helperText={error?.message || field.helperText}
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
                label={field.label}
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
                label={field.label}
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
                label={field.label}
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
                label={field.label}
                options={field.options as string[]}
                multiple={field.multiple}
                value={ctrl.value}
                onChange={ctrl.onChange}
                placeholder={field.placeholder}
                freeSolo={field.freeSolo}
                sx={{ width: "100%" }}
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

export default function CustomForm({
  fields,
  onSubmit,
  buttonName = "Submit",
  externalLink,
  buttonSx = "",
  zodSchema = null,
  loading,
}: CustomFormProps) {
  const { setTost } = useAppStore();
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

  const { control, handleSubmit, register, formState } = useForm<SchemaType>({
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
      <div className="">
        <div className="flex flex-col gap-4">
          {fields.map((field) => {
            // If field is part of a row group, skip here (we will render it later)
            if (field.row) return null;

            return (
              <FormField
                key={field.name}
                field={field}
                control={control}
                register={register}
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
                  register={register}
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
      <Button
        sx={{ buttonSx }}
        type="submit"
        disabled={isSubmitting}
        size="medium"
        variant="contained"
      >
        {isSubmitting || loading ? <Loader /> : buttonName}
      </Button>
      {renderLinks("below")}
    </form>
  );
}
