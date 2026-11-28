"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {

  return (
    <Sonner
      theme="light" // the panel has one theme; "system" made dark toasts on a light page
      className="toaster group"
      // Below the 64px header, so a toast never covers the menu, search or account
      // buttons, and never the action bar at the bottom of a form.
      offset={{ top: 76 }}
      mobileOffset={{ top: 'calc(72px + env(safe-area-inset-top))' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Keeps its small circle, with a 40px hit area on touch screens
          closeButton: "pg-hit",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
