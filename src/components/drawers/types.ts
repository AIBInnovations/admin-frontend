import { ReactNode } from 'react';

/**
 * Base drawer props
 */
export interface BaseDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Drawer content */
  children: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
}

/**
 * Side drawer props (extends base with side option)
 */
export interface SideDrawerProps extends BaseDrawerProps {
  /** Which side to open from */
  side?: 'left' | 'right';
}

/**
 * Bottom drawer props (same as base)
 */
export interface BottomDrawerProps extends BaseDrawerProps {}
