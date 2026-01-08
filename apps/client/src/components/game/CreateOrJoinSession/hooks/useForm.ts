import { useState } from "react";
import { z } from "zod";
import { createSession, joinSession } from "@/app-store";

function getInitialMode(sharedSlug: string | null): "create" | "join" {
  return sharedSlug ? "join" : "create";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

const UsernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters")
  .max(20, "Username must be at most 20 characters");

const SessionSlugSchema = z
  .string()
  .regex(
    /^s_[a-zA-Z0-9]{6}$/,
    "Invalid session slug format, should be: s_XXXXXX",
  );

const CreateSessionSchema = z.object({
  mode: z.literal("create"),
  username: UsernameSchema,
});

const JoinSessionSchema = z.object({
  mode: z.literal("join"),
  username: UsernameSchema,
  slug: SessionSlugSchema,
});

const CreateOrJoinSessionFormSchema = z.discriminatedUnion("mode", [
  JoinSessionSchema,
  CreateSessionSchema,
]);

type CreateOrJoinSessionFormValues = z.infer<
  typeof CreateOrJoinSessionFormSchema
>;

type KeysOfUnion<T> = T extends T ? keyof T : never;

interface UseFormReturn {
  values: CreateOrJoinSessionFormValues;
  errors: {
    username: string | null;
    slug: string | null;
    network: string | null;
  };
  setValue: (
    key: KeysOfUnion<CreateOrJoinSessionFormValues>,
    value: string,
  ) => void;
  loading: boolean;
  validate: () => void;
  toggleMode: () => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useForm(slug: string | null): UseFormReturn {
  const [values, setValues] = useState<CreateOrJoinSessionFormValues>({
    mode: getInitialMode(slug),
    username: "",
    slug: slug || "",
  });

  const [errors, setErrors] = useState<{
    username: string | null;
    slug: string | null;
    network: string | null;
  }>({
    username: null,
    slug: null,
    network: null,
  });

  const [loading, setLoading] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  function resetErrors(): void {
    setErrors({ username: null, slug: null, network: null });
  }

  function validateValues(): boolean {
    const result = CreateOrJoinSessionFormSchema.safeParse(values);

    if (!result.success) {
      const errors = result.error.issues;

      for (const error of errors) {
        if (error.path[0] === "username") {
          setErrors((prevErrors) => ({
            ...prevErrors,
            username: error.message,
          }));
        }
        if (error.path[0] === "slug") {
          setErrors((prevErrors) => ({
            ...prevErrors,
            slug: error.message,
          }));
        }
      }

      return false;
    }

    resetErrors();
    return true;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validateValues()) {
      return;
    }

    setLoading(true);
    setErrors((e) => ({ ...e, network: null }));

    try {
      if (values.mode === "create") {
        await createSession(values.username.trim());
      } else {
        await joinSession(values.slug.trim(), values.username.trim());
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      const action = values.mode === "create" ? "create" : "join";
      setErrors((e) => ({
        ...e,
        network: `Failed to ${action} session: ${errorMessage}`,
      }));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode(): void {
    setValues((v) => ({
      ...v,
      mode: v.mode === "create" ? "join" : "create",
      slug: "",
    }));
    resetErrors();
  }

  function setValue(
    key: KeysOfUnion<CreateOrJoinSessionFormValues>,
    value: string,
  ): void {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate() {
    if (!hasAttemptedSubmit) return true;

    return validateValues();
  }

  return {
    values,
    errors,
    setValue,
    validate,
    loading,
    toggleMode,
    handleSubmit,
  };
}
