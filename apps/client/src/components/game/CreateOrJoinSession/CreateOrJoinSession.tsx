import { Button, PageLayout, Subtitle, Title } from "@/components/ui";
import { getSharedSessionSlug } from "@/utils/url-sharing";
import { useForm } from "./hooks/useForm";
import { ErrorMessage } from "./ui/ErrorMessage";
import { FormField } from "./ui/FormField";

const FORM_ID = "create-or-join-session";

export function CreateOrJoinSession() {
  const sharedSlug = getSharedSessionSlug();

  const {
    values,
    errors,
    validate,
    loading,
    setValue,
    handleSubmit,
    toggleMode,
  } = useForm(sharedSlug);

  return (
    <PageLayout
      header={
        <>
          <Title>Battleships</Title>
          <Subtitle>
            {values.mode === "create"
              ? "Create a new game"
              : "Join a friend's game"}
          </Subtitle>
        </>
      }
      footer={
        values.mode === "create" ? (
          <>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={loading}
              ariaLabel="Create session"
            >
              {loading ? "Creating..." : "Create Session"}
            </Button>
            <Button
              variant="option"
              onClick={toggleMode}
              disabled={loading}
              ariaLabel="Switch to join session mode"
            >
              Want to join a friend instead?
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={loading}
              ariaLabel="Join session"
            >
              {loading ? "Joining..." : "Join Session"}
            </Button>
            <Button
              variant="option"
              onClick={toggleMode}
              disabled={loading}
              ariaLabel="Switch to create session mode"
            >
              Create a new session instead?
            </Button>
          </>
        )
      }
    >
      <form
        id={FORM_ID}
        aria-label="Create or join game session"
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <FormField
          id="username"
          label="How do you want to be called?"
          value={values.username}
          onChange={(value) => setValue("username", value)}
          onBlur={validate}
          placeholder="Furax Barbarossa"
          disabled={loading}
          error={errors.username}
          required
        />

        {values.mode === "join" && (
          <FormField
            id="slug"
            label="Type in the code your friend shared:"
            value={values.slug}
            onChange={(value) => setValue("slug", value)}
            onBlur={validate}
            placeholder="s_XXXXXX"
            disabled={Boolean(sharedSlug) || loading}
            error={errors.slug}
            required
          />
        )}

        <ErrorMessage message={errors.network} />
      </form>
    </PageLayout>
  );
}
