export function ErrorMessage({
  id,
  message,
}: {
  id?: string;
  message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className="text-sm text-red-400 mt-1 font-medium">
      {message}
    </p>
  );
}
