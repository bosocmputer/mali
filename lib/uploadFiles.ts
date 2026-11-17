/** Upload files one by one through /api/upload and return their URLs (client side). */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `อัปโหลด ${file.name} ไม่สำเร็จ`);
    urls.push(json.url);
  }
  return urls;
}

/**
 * Name to show for an uploaded file: the original name kept in "<user>-<13-digit time>-<name>.<ext>";
 * older uploads ("<user>-<time>.<ext>") only show their type.
 */
export function fileNameOf(url: string): string {
  let name = url.split("/").pop() ?? url;
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep as is
  }
  const kept = name.match(/-\d{13}-(.+)$/);
  if (kept) return kept[1];
  const ext = name.split(".").pop();
  return ext && ext !== name ? `ไฟล์แนบ.${ext}` : "ไฟล์แนบ";
}
