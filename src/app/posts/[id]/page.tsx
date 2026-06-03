"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import EditorPost from "@/components/EditorPost";

export default function EditarPostPage() {
  const params = useParams();
  const id = String(params.id);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/calendario" className="text-sm text-muted hover:text-ink">
          ← Calendário
        </Link>
        <div className="micro-label mt-3">Editar publicação</div>
        <h1 className="mt-1 font-display text-4xl font-light tracking-tight">
          Editar post
        </h1>
      </header>

      <EditorPost postId={id} />
    </div>
  );
}
