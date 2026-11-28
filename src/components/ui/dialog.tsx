import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowLeft, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { workspaceStore } from "@/components/layouts/workspaceStore"

/**
 * Dialog, without popups.
 *
 *   page  (default)  a full page inside the content area. The menu and header
 *                    stay usable, Back closes it, unsaved edits are guarded.
 *   dock             a panel docked at the bottom, for a short question.
 *   modal            a centred window. Only for tools that need one (image
 *                    cropping inside a form). Do not use it for forms.
 *
 * The API is Radix's, so existing forms work unchanged.
 */
type DialogVariant = "page" | "dock" | "modal"

interface DialogContextValue {
  variant: DialogVariant
  markDirty: () => void
}
const DialogVariantContext = React.createContext<DialogContextValue>({ variant: "page", markDirty: () => {} })

interface DialogProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  variant?: DialogVariant
  /** Turn the "leave without saving?" check off (read-only workspaces). */
  guardUnsaved?: boolean
}

function Dialog({ variant = "page", guardUnsaved = true, open, defaultOpen, onOpenChange, children, modal, ...props }: DialogProps) {
  const id = React.useId()
  const dirty = React.useRef(false)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const isOpen = open ?? uncontrolledOpen
  const isPage = variant === "page"

  const change = React.useCallback((next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }, [open, onOpenChange])
  const changeRef = React.useRef(change)
  changeRef.current = change

  // Closed by its owner (after a save, or Cancel): nothing left to guard.
  React.useEffect(() => { if (!isOpen) dirty.current = false }, [isOpen])

  React.useEffect(() => {
    if (!isPage || !isOpen) return
    workspaceStore.openWorkspace({ id, close: () => changeRef.current(false) })
    if (guardUnsaved) workspaceStore.setGuard(id, () => dirty.current)
    return () => {
      workspaceStore.clearGuard(id)
      workspaceStore.closeWorkspace(id)
    }
  }, [id, isPage, isOpen, guardUnsaved])

  const handleOpenChange = (next: boolean) => {
    if (!next && isPage && guardUnsaved && dirty.current) {
      workspaceStore.ask({ onDiscard: () => { dirty.current = false; changeRef.current(false) } })
      return
    }
    change(next)
  }

  const context = React.useMemo<DialogContextValue>(() => ({ variant, markDirty: () => { dirty.current = true } }), [variant])

  return (
    <DialogVariantContext.Provider value={context}>
      <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} modal={modal ?? !isPage} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogVariantContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("pg-fade fixed inset-0 z-50 bg-ink/40", className)}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Page variant: width of the content column. Forms read best at `default`. */
  size?: "default" | "wide" | "full"
  /** Page variant: label of the back link. */
  backLabel?: string
}

const PAGE_WIDTH = { default: "max-w-[880px]", wide: "max-w-[1160px]", full: "max-w-[1440px]" } as const

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size = "default", backLabel = "Back", onInteractOutside, onOpenAutoFocus, ...props }, ref) => {
  const { variant, markDirty } = React.useContext(DialogVariantContext)

  if (variant === "page") {
    // Only a person's own edits count, not values set by code.
    const onEdit = (e: React.SyntheticEvent) => { if (e.nativeEvent.isTrusted) markDirty() }
    const onToggle = (e: React.MouseEvent) => {
      if (!e.nativeEvent.isTrusted) return
      const el = (e.target as HTMLElement).closest('[role="switch"], [role="checkbox"], [role="radio"], [role="option"]')
      if (el) markDirty()
    }
    const host = typeof document === "undefined" ? undefined : document.getElementById("workspace-root") ?? undefined
    return (
      <DialogPortal container={host}>
        <DialogPrimitive.Content
          ref={ref}
          data-variant="page"
          aria-modal={false}
          tabIndex={-1}
          onInteractOutside={(e) => { onInteractOutside?.(e); e.preventDefault() }}
          onOpenAutoFocus={(e) => {
            onOpenAutoFocus?.(e)
            if (e.defaultPrevented) return
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true })
          }}
          onInputCapture={onEdit}
          onChangeCapture={onEdit}
          onClickCapture={onToggle}
          className={cn(
            "pg-page pointer-events-auto z-30 overflow-y-auto overscroll-contain bg-background outline-none",
            host ? "absolute inset-0" : "fixed inset-0"
          )}
          {...props}
        >
          <div className={cn("mx-auto w-full px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8", PAGE_WIDTH[size])}>
            <DialogPrimitive.Close className="-ml-2 mb-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium pointer-coarse:h-10 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {backLabel}
            </DialogPrimitive.Close>
            <div
              className={cn(
                className,
                // Sizes written for a popup do not apply to a page
                "flex w-full min-w-0 !max-h-none !max-w-none flex-col gap-5 !overflow-visible !p-0"
              )}
            >
              {children}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }

  if (variant === "dock") {
    return (
      <DialogPortal>
        <DialogPrimitive.Overlay className="pg-fade fixed inset-0 z-50 bg-ink/20" />
        <DialogPrimitive.Content
          ref={ref}
          data-variant="dock"
          onInteractOutside={onInteractOutside}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            "pg-dock fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-h-[min(80dvh,720px)] w-auto flex-col gap-4 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-5 shadow-raised outline-none",
            className,
            "!max-w-[640px]"
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="pg-hit absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-variant="modal"
        onInteractOutside={onInteractOutside}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "pg-pop fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto overflow-x-hidden rounded-xl border bg-card px-6 pb-0 pt-6 shadow-raised",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="pg-hit absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { variant } = React.useContext(DialogVariantContext)
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col space-y-1.5 text-left",
        variant === "dock" && "pr-8 pointer-coarse:pr-12",
        variant === "page" && "space-y-1",
        className
      )}
      {...props}
    />
  )
}
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { variant } = React.useContext(DialogVariantContext)
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0",
        // A page's actions stay in view however long the form is
        variant === "page" &&
          "sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        // Phones: the actions share one row (Cancel left, the action right), as in
        // an app, instead of a stack that eats the bottom of the screen
        variant === "page" &&
          "max-sm:flex-row max-sm:flex-wrap max-sm:[&>a]:min-w-[8rem] max-sm:[&>a]:flex-1 max-sm:[&>button]:min-w-[8rem] max-sm:[&>button]:flex-1 max-sm:[&>p]:basis-full",
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(DialogVariantContext)
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        variant === "page"
          ? "font-display text-[22px] font-semibold leading-tight tracking-[-0.015em] sm:text-[26px]"
          : "text-lg font-semibold leading-snug tracking-tight",
        className
      )}
      {...props}
    />
  )
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
