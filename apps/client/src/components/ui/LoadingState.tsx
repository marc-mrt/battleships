interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center animate-pulse">
      <p>{message}</p>
    </div>
  );
}
