"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { FolderPlus, CornerDownRight } from "lucide-react";
import { CATEGORIES, CREATE_CATEGORY } from "@/graphql/operations";
import type { Category } from "@/graphql/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Flatten the category list into a depth-first tree ordering for display. */
function orderAsTree(categories: Category[]): Category[] {
  const byParent = new Map<string | null, Category[]>();
  for (const cat of categories) {
    const key = cat.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(cat);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
  const ordered: Category[] = [];
  function walk(parentId: string | null) {
    for (const cat of byParent.get(parentId) ?? []) {
      ordered.push(cat);
      walk(cat.id);
    }
  }
  walk(null);
  // Orphans (parent not loaded) go at the end rather than disappearing.
  if (ordered.length < categories.length) {
    const seen = new Set(ordered.map((c) => c.id));
    ordered.push(...categories.filter((c) => !seen.has(c.id)));
  }
  return ordered;
}

export default function CategoriesPage() {
  const { data, loading } = useQuery(CATEGORIES);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");

  const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: ["Categories"],
  });

  const categories = useMemo(() => orderAsTree(data?.categories ?? []), [data]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCategory({
        variables: {
          input: {
            name: name.trim(),
            slug: slug.trim() || slugify(name),
            parentId: parentId || undefined,
            description: description.trim() || undefined,
          },
        },
      });
      toast.success(`Category “${name.trim()}” created`);
      setCreateOpen(false);
      setName("");
      setSlug("");
      setSlugTouched(false);
      setParentId("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {categories.length} categories · content is auto-classified into these by AI
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <FolderPlus />
          New category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && categories.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              No categories yet — create the first root category
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${cat.depth * 20}px` }}
                      >
                        {cat.depth > 0 && <CornerDownRight className="size-3.5 text-muted" />}
                        {cat.icon && <span>{cat.icon}</span>}
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted">{cat.slug}</TableCell>
                    <TableCell className="text-sm text-muted">{cat.contentCount}</TableCell>
                    <TableCell>
                      {cat.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Categories power discovery filters and AI classification.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="electronics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">Parent category</Label>
              <Select
                id="cat-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">None — root category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"— ".repeat(cat.depth)}
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Input
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
