import { tv, type VariantProps } from "tailwind-variants/lite";

const button = tv({
  base: "w-full px-6 py-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
  variants: {
    variant: {
      primary:
        "bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
      option:
        "py-2 text-sm text-cyan-300 hover:text-cyan-200 underline-offset-4 hover:underline",
    },
  },
});

type ButtonVariants = VariantProps<typeof button>;

interface ButtonProps extends ButtonVariants {
  ariaLabel: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
  form?: string;
  children: React.ReactNode;
}

export function Button({
  ariaLabel,
  type = "button",
  form,
  disabled,
  onClick,
  children,
  variant = "primary",
}: ButtonProps) {
  const className = button({ variant });

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}
