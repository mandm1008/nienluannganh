'use client';

import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Tooltip({ children, content, placement = 'top' }) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, update } = useFloating({
    open,
    placement,
    middleware: [offset(8), flip(), shift()],
  });

  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) return;
    return autoUpdate(refs.reference.current, refs.floating.current, update);
  }, [refs.reference, refs.floating, update]);

  return (
    <div
      ref={refs.setReference}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="inline-block"
    >
      {children}

      <AnimatePresence>
        {open && (
          <div ref={refs.setFloating} style={floatingStyles}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="z-50 bg-black text-white text-sm rounded px-2 py-1"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
