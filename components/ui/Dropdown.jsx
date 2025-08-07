'use client';

import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dropdown({
  trigger,
  children,
  placement = 'bottom-end',
}) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, update } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(6), flip(), shift()],
  });

  useEffect(() => {
    if (!open || !refs.reference.current || !refs.floating.current) return;
    return autoUpdate(refs.reference.current, refs.floating.current, update);
  }, [open, refs.reference, refs.floating, update]);

  return (
    <div className="relative inline-block">
      <div
        ref={refs.setReference}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white border rounded-lg shadow-lg p-2 w-48"
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
