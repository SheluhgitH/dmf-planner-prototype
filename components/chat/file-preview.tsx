"use client";

import { useState } from "react";
import { FileText, ImageIcon, MusicIcon, VideoIcon, File as GenericFileIcon, Download } from "lucide-react";
import type { MessageAttachment } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { ImageModal } from "@/components/ui/image-modal";

export function FilePreview({
  attachment,
  className,
}: {
  attachment: MessageAttachment;
  className?: string;
}) {
  const { mimeType, url, fileName, fileSize } = attachment;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const renderFileSize = () => {
    if (!fileSize) return null;
    const kb = fileSize / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  if (mimeType?.startsWith("image/")) {
    return (
      <>
        {url ? (
          <button type="button" onClick={() => setIsImageModalOpen(true)} className={cn("block", className)}>
            <img
              src={url}
              alt={fileName}
              className="max-h-48 rounded-lg border border-zinc-700 object-contain"
            />
          </button>
        ) : (
          <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
            <ImageIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} (loading…)
          </div>
        )}
        {url && (
          <ImageModal
            src={url}
            alt={fileName}
            open={isImageModalOpen}
            onOpenChange={setIsImageModalOpen}
          />
        )}
      </>
    );
  }

  if (mimeType?.startsWith("video/")) {
    return url ? (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden", className)}>
        <video controls src={url} className="w-full max-h-64 object-contain" />
        <div className="px-3 py-2 text-sm text-zinc-400 border-t border-zinc-700">
          <VideoIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} {renderFileSize()}
        </div>
      </div>
    ) : (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
        <VideoIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} (loading…)
      </div>
    );
  }

  if (mimeType?.startsWith("audio/")) {
    return url ? (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden", className)}>
        <audio controls src={url} className="w-full p-2" />
        <div className="px-3 py-2 text-sm text-zinc-400 border-t border-zinc-700">
          <MusicIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} {renderFileSize()}
        </div>
      </div>
    ) : (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
        <MusicIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} (loading…)
      </div>
    );
  }

  if (mimeType === "application/pdf") {
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-violet-300 hover:bg-zinc-800",
          className
        )}
      >
        <FileText className="mr-2 inline-block h-5 w-5" />
        <span className="font-medium">View PDF</span>
        <span className="ml-2 text-zinc-400">
          {fileName} {renderFileSize()}
        </span>
      </a>
    ) : (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
        <FileText className="mr-2 inline-block h-5 w-5" /> {fileName} (loading…)
      </div>
    );
  }

  if (mimeType?.startsWith("text/") || mimeType?.endsWith("json")) {
    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-violet-300 hover:bg-zinc-800",
          className
        )}
      >
        <FileText className="mr-2 inline-block h-5 w-5" />
        <span className="font-medium">View</span>
        <span className="ml-2 text-zinc-400">
          {fileName} {renderFileSize()}
        </span>
      </a>
    ) : (
      <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
        <FileText className="mr-2 inline-block h-5 w-5" /> {fileName} (loading…)
      </div>
    );
  }

  // Default case for any other file type
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-violet-300 hover:bg-zinc-800",
        className
      )}
    >
      <GenericFileIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} {renderFileSize()}
      <Download className="h-4 w-4 ml-2 inline-block" />
    </a>
  ) : (
    <div className={cn("rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400", className)}>
      <GenericFileIcon className="h-5 w-5 mr-2 inline-block" /> {fileName} (loading…)
    </div>
  );
}
