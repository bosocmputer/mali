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

export const fileNameOf = (url: string) => decodeURIComponent(url.split("/").pop() ?? url);
