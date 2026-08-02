"use client";

import { useState } from "react";

import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";

import { useProjectStore } from "@/store/project";

import { Project } from "@/types/project";

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  taskCount: number;
}

export function DeleteProjectDialog({
  isOpen,
  onClose,
  project,
  taskCount,
}: DeleteProjectDialogProps) {
  const { deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      onClose();
      project.onClose?.();
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="needt-scrim data-[state=open]:animate-overlayShow fixed inset-0 z-[60]" />
        <Dialog.Content className="needt-overlay-depth data-[state=open]:animate-contentShow fixed left-[50%] top-[50%] z-[61] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[var(--dialog-radius)] border border-[var(--dialog-border)] p-[25px] text-[var(--text-primary)] shadow-lg focus:outline-none">
          <Dialog.Title className="m-0 text-[17px] font-medium">
            Delete Project
          </Dialog.Title>
          <Dialog.Description className="mb-5 mt-4 text-[15px] leading-normal">
            <p className="mb-3">
              Are you sure you want to delete <strong>{project.name}</strong>?
            </p>
            <p className="mb-3 font-bold text-red-600">
              ⚠️ This action cannot be undone. The project will be permanently
              deleted.
            </p>
            {taskCount > 0 && (
              <p className="text-red-600">
                This will also delete {taskCount} task
                {taskCount === 1 ? "" : "s"} associated with this project.
              </p>
            )}
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-4">
            <button
              className="inline-flex h-[35px] items-center justify-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] px-[15px] text-[15px] leading-none outline-none hover:bg-[var(--control-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className="inline-flex h-[35px] items-center justify-center rounded-[var(--control-radius)] border border-[var(--button-danger-border)] bg-[var(--button-danger-bg)] px-[15px] text-[15px] leading-none text-[var(--color-danger)] outline-none hover:bg-[var(--button-danger-bg-hover)] disabled:opacity-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-[10px] top-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="Close"
              disabled={isDeleting}
            >
              <IoClose />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
