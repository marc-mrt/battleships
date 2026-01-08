import { QRCodeSVG } from "qrcode.react";
import { Button, Check, PageLayout } from "@/components/ui";
import { buildSharedUrl } from "@/utils/url-sharing";
import type { SessionRendererProps } from "../prop-types";
import { useClipboard } from "./hooks/useClipboard";
import { Header } from "./ui/Header";

export function WaitingForOpponent({
  slug,
}: SessionRendererProps): JSX.Element {
  const { copy, isCopied } = useClipboard();

  const inviteUrl = buildSharedUrl(slug);

  function handleCopy() {
    copy(inviteUrl);
  }

  return (
    <PageLayout header={<Header />}>
      <QRCodeSVG className="mx-auto p-2 bg-white" value={inviteUrl} />
      <Button
        variant="option"
        onClick={handleCopy}
        ariaLabel="Link to share with a friend"
      >
        {inviteUrl}
      </Button>
      {isCopied && (
        <p className="flex justify-center text-xs text-green-400">
          Copied
          <Check size={12} />
        </p>
      )}
    </PageLayout>
  );
}
