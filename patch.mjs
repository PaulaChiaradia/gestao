import { readFileSync, writeFileSync } from "node:fs";
const f = "src/app/(app)/tarefas/task-comments.tsx";
let s = readFileSync(f, "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("não achei: " + a.slice(0, 70)); s = s.replace(a, b); };
rep(`setThumbs((t) => ({ ...t, ...Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl])) }));`,
    `setThumbs((t) => ({
          ...t,
          ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string])),
        }));`);
rep(`function iconFor(a: { mime: string | null; name: string }) {
  const n = a.name.toLowerCase();
  const m = a.mime ?? "";
  if (isImage(a)) return FileImage;
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/.test(n)) return FileVideo;
  if (/\.(xlsx?|csv|ods)$/.test(n) || m.includes("spreadsheet") || m.includes("excel")) return FileSpreadsheet;
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return FileArchive;
  if (/\.(pdf|docx?|odt|txt|rtf|pptx?)$/.test(n) || m.includes("pdf") || m.includes("word") || m.startsWith("text/")) return FileText;
  return FileIcon;
}`,
`function kindOf(a: { mime: string | null; name: string }) {
  const n = a.name.toLowerCase();
  const m = a.mime ?? "";
  if (isImage(a)) return "imagem";
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/.test(n)) return "video";
  if (/\.(xlsx?|csv|ods)$/.test(n) || m.includes("spreadsheet") || m.includes("excel")) return "planilha";
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return "compactado";
  if (/\.(pdf|docx?|odt|txt|rtf|pptx?)$/.test(n) || m.includes("pdf") || m.includes("word") || m.startsWith("text/")) return "documento";
  return "outro";
}

/** Ícone do tipo de arquivo (imagem, planilha, documento…). */
function FileTypeIcon({ file, className }: { file: { mime: string | null; name: string }; className?: string }) {
  switch (kindOf(file)) {
    case "imagem":
      return <FileImage className={className} />;
    case "video":
      return <FileVideo className={className} />;
    case "planilha":
      return <FileSpreadsheet className={className} />;
    case "compactado":
      return <FileArchive className={className} />;
    case "documento":
      return <FileText className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}`);
rep(`  const [error, setError] = useState<string>();
  const Icon = iconFor(a);
`, `  const [error, setError] = useState<string>();
`);
rep(`            <Icon className={\`\${compact ? "size-4" : "size-5"} text-accent\`} />`, `            <FileTypeIcon file={a} className={\`\${compact ? "size-4" : "size-5"} text-accent\`} />`);
rep(`          {files.map(({ id, file }) => {
            const Icon = iconFor({ mime: file.type, name: file.name });
            return (`, `          {files.map(({ id, file }) => {
            return (`);
rep(`                <Icon className="size-3.5 shrink-0 text-accent" />`, `                <FileTypeIcon file={{ mime: file.type, name: file.name }} className="size-3.5 shrink-0 text-accent" />`);
writeFileSync(f, s);
console.log("ok");
