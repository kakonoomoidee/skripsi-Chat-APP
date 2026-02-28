import { formatTime } from "@/utils/format";
import { DocumentIcon } from "@/components/icons";

/**
 * Renders a chat bubble specifically formatted for document files.
 * @param {Object} props - The component props.
 * @param {any} props.msg - The message entity.
 * @param {string} props.fileName - The extracted file name.
 * @param {string} props.fileData - The raw base64 data string.
 * @returns {JSX.Element} The rendered document bubble.
 */
export const DocumentBubble = ({
  msg,
  fileName,
  fileData,
}: {
  msg: any;
  fileName: string;
  fileData: string;
}) => {
  return (
    <div
      className={`relative flex flex-col min-w-37.5 max-w-[85vw] md:max-w-[20rem] shadow-sm px-3 py-2 ${
        msg.isMine
          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm self-end"
          : "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm self-start"
      }`}
    >
      <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl mb-1 border border-white/5">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
          <DocumentIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-zinc-100">
            {fileName}
          </p>
          <a
            href={fileData}
            download={fileName}
            className="text-[10px] text-indigo-300 hover:text-indigo-100 uppercase tracking-wider font-bold mt-0.5 block transition-colors"
          >
            Download
          </a>
        </div>
      </div>
      <span
        className={`text-[9px] mt-1 font-medium select-none ${
          msg.isMine ? "text-indigo-200 text-right" : "text-zinc-400 text-left"
        }`}
      >
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
};
