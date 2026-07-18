"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import {
  FolderPlus,
  CornerDownRight,
  MoreHorizontal,
  PencilLine,
  Trash2,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  ADMIN_CATEGORIES,
  CREATE_CATEGORY,
  DELETE_CATEGORY,
  SET_CATEGORY_ACTIVE,
  UPDATE_CATEGORY,
} from "@/graphql/operations";
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
import { Textarea } from "@/components/ui/textarea";
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
  const { data, loading, refetch } = useQuery(ADMIN_CATEGORIES, {
    fetchPolicy: "cache-and-network",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [openActionCategoryId, setOpenActionCategoryId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");

  const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: ["AdminCategories"],
  });
  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY);
  const [setCategoryActive, { loading: updatingStatus }] = useMutation(SET_CATEGORY_ACTIVE);
  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY);

  const categories = useMemo(() => orderAsTree(data?.adminCategories ?? []), [data]);

  useEffect(() => {
    if (!openActionCategoryId) return;

    function handlePointerDown(event: MouseEvent) {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionCategoryId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenActionCategoryId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionCategoryId]);

  useEffect(() => {
    if (!selectedCategory || !editOpen) return;
    setEditName(selectedCategory.name);
    setEditSlug(selectedCategory.slug);
    setEditSlugTouched(false);
    setEditDescription(selectedCategory.description ?? "");
    setEditIcon(selectedCategory.icon ?? "");
    setEditSortOrder(String(selectedCategory.sortOrder));
  }, [selectedCategory, editOpen]);

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
      await refetch();
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

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      await updateCategory({
        variables: {
          id: selectedCategory.id,
          input: {
            name: editName.trim(),
            slug: editSlug.trim() || slugify(editName),
            description: editDescription.trim() || "",
            icon: editIcon.trim() || "",
            sortOrder: Number(editSortOrder) || 0,
          },
        },
      });
      toast.success(`Category “${editName.trim()}” updated`);
      await refetch();
      setEditOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    }
  }

  async function handleToggleActive() {
    if (!selectedCategory) return;
    try {
      await setCategoryActive({
        variables: {
          id: selectedCategory.id,
          active: !selectedCategory.isActive,
        },
      });
      toast.success(
        selectedCategory.isActive
          ? `Category “${selectedCategory.name}” is now inactive`
          : `Category “${selectedCategory.name}” reactivated`,
      );
      await refetch();
      setStatusOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category status");
    }
  }

  async function handleDelete() {
    if (!selectedCategory) return;
    try {
      await deleteCategory({ variables: { id: selectedCategory.id } });
      toast.success(`Category “${selectedCategory.name}” deleted`);
      await refetch();
      setDeleteOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      <div
                        className="flex items-center justify-end"
                        ref={openActionCategoryId === cat.id ? actionMenuRef : null}
                      >
                        <div className="relative">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-full"
                            onClick={() =>
                              setOpenActionCategoryId((current) =>
                                current === cat.id ? null : cat.id,
                              )
                            }
                            aria-label="Category actions"
                            aria-expanded={openActionCategoryId === cat.id}
                            aria-haspopup="menu"
                          >
                            <MoreHorizontal />
                          </Button>

                          {openActionCategoryId === cat.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-10 z-[60] min-w-44 rounded-2xl border border-border bg-elevated p-1.5 shadow-lg"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionCategoryId(null);
                                  setSelectedCategory(cat);
                                  setEditOpen(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-subtle"
                              >
                                <PencilLine />
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionCategoryId(null);
                                  setSelectedCategory(cat);
                                  setStatusOpen(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-subtle"
                              >
                                {cat.isActive ? <EyeOff /> : <Eye />}
                                {cat.isActive ? "Make inactive" : "Make active"}
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionCategoryId(null);
                                  setSelectedCategory(cat);
                                  setDeleteOpen(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-error-soft"
                              >
                                <Trash2 />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Update the category details shown to admins and used by the taxonomy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input
                id="edit-cat-name"
                required
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (!editSlugTouched) setEditSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-slug">Slug</Label>
              <Input
                id="edit-cat-slug"
                required
                value={editSlug}
                onChange={(e) => {
                  setEditSlugTouched(true);
                  setEditSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-icon">Icon (optional)</Label>
              <Input
                id="edit-cat-icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                placeholder="e.g. 📱"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-sort">Sort order</Label>
              <Input
                id="edit-cat-sort"
                type="number"
                min={0}
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-desc">Description (optional)</Label>
              <Textarea
                id="edit-cat-desc"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updating}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory?.isActive ? "Make category inactive" : "Reactivate category"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.isActive
                ? "This removes the category from creator-facing pickers. Child categories under it will also be marked inactive so sellers do not see a broken subtree."
                : "This makes the category selectable again for new posts."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={selectedCategory?.isActive ? "secondary" : "success"}
              onClick={() => void handleToggleActive()}
              loading={updatingStatus}
            >
              {selectedCategory?.isActive ? "Make inactive" : "Make active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{selectedCategory?.name}</span>{" "}
              only if it has no child categories and no posts. This is a permanent action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              loading={deleting}
            >
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
