"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WebArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string | null;
  authorName: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
}

const DEFAULT_COVERS = [
  { label: "ภาพบัญชี / ภาษี", url: "https://hash-tax.com/assets/opt/image2.jpg" },
  { label: "ภาพทีมงาน", url: "https://hash-tax.com/assets/opt/photo2.jpg" },
  { label: "ภาพวีซ่า / เอกสาร", url: "https://hash-tax.com/assets/opt/image3.jpg" },
];

export default function ArticlesAdminPage() {
  const [articles, setArticles] = useState<WebArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState(DEFAULT_COVERS[0].url);
  const [authorName, setAuthorName] = useState("ทีมงาน HASH-TAX");
  const [isPublished, setIsPublished] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setArticles(json.data ?? []);
    } catch {
      toast.error("โหลดรายการบทความไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setTitle("");
    setExcerpt("");
    setContent("");
    setCoverUrl(DEFAULT_COVERS[0].url);
    setAuthorName("ทีมงาน HASH-TAX");
    setIsPublished(true);
    setShowForm(true);
  }

  function openEdit(a: WebArticle) {
    setEditingId(a.id);
    setTitle(a.title);
    setExcerpt(a.excerpt);
    setContent(a.content);
    setCoverUrl(a.coverUrl || DEFAULT_COVERS[0].url);
    setAuthorName(a.authorName);
    setIsPublished(a.isPublished);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/articles/${editingId}` : "/api/articles";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          coverUrl: coverUrl.trim() || null,
          authorName: authorName.trim() || "ทีมงาน HASH-TAX",
          isPublished,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      toast.success(editingId ? "แก้ไขบทความเรียบร้อย" : "เพิ่มบทความใหม่เรียบร้อย");
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(a: WebArticle) {
    try {
      const res = await fetch(`/api/articles/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !a.isPublished }),
      });
      if (!res.ok) throw new Error();
      toast.success(!a.isPublished ? "เผยแพร่บทความแล้ว" : "ซ่อนเป็นฉบับร่างแล้ว");
      await load();
    } catch {
      toast.error("เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ยืนยันการลบบทความนี้?")) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("ลบบทความแล้ว");
      await load();
    } catch {
      toast.error("ลบบทความไม่สำเร็จ");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            จัดการบทความเว็บไซต์ (hash-tax.com)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            เพิ่มและแก้ไขบทความที่จะแสดงบนหน้า https://hash-tax.com/articles.html โดยตรง
          </p>
        </div>

        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          เพิ่มบทความใหม่
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? "แก้ไขบทความ" : "เขียนบทความใหม่"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="art-title">หัวข้อบทความ *</Label>
                <Input
                  id="art-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ภาษีนิติบุคคล 2569: สิ่งที่ผู้ประกอบการต้องรู้"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="art-author">ชื่อผู้เขียน</Label>
                  <Input
                    id="art-author"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="art-cover">ลิงก์รูปปก (URL)</Label>
                  <Input
                    id="art-cover"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://hash-tax.com/assets/opt/image2.jpg"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DEFAULT_COVERS.map((c) => (
                      <button
                        key={c.url}
                        type="button"
                        onClick={() => setCoverUrl(c.url)}
                        className="text-xs px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="art-excerpt">สรุปย่อ (แสดงในการ์ดหน้าบทความ) *</Label>
                <textarea
                  id="art-excerpt"
                  required
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="สรุปใจความสำคัญ 1-2 บรรทัด..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="art-content">เนื้อหาบทความ * (ขึ้นย่อหน้าใหม่ด้วยการเว้นบรรทัด)</Label>
                <textarea
                  id="art-content"
                  required
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="เขียนเนื้อหาบทความที่นี่..."
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                เผยแพร่ขึ้นหน้าเว็บ hash-tax.com ทันที
              </label>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "กำลังบันทึก..." : "บันทึกบทความ"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีบทความในระบบ กดปุ่ม &ldquo;เพิ่มบทความใหม่&rdquo; เพื่อเริ่มสร้างบทความแรกได้เลยครับ
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base">{a.title}</h3>
                    <Badge variant={a.isPublished ? "default" : "secondary"}>
                      {a.isPublished ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
                  <p className="text-xs text-muted-foreground">
                    ผู้เขียน: {a.authorName} · อัปเดต:{" "}
                    {new Date(a.publishedAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {a.isPublished && (
                    <a
                      href={`https://hash-tax.com/article-1.html?slug=${encodeURIComponent(a.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs hover:bg-secondary"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      ดูหน้าเว็บ
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>
                    {a.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
