'use client';

import { useState, useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useInteractions,
  arrow as floatingArrow,
  safePolygon
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export default function EventRoom({
  title,
  timeStart,
  timeEnd,
  serviceUrl,
  children,
}) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [
      offset(0),
      flip(),
      shift(),
    ],
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 200, close: 0 },
    handleClose: safePolygon(),
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) return;
    return autoUpdate(
      refs.reference.current,
      refs.floating.current,
      context.update
    );
  }, [refs.reference, refs.floating, context.update]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-gray-800 text-white border border-gray-300 rounded-lg shadow-lg text-sm p-2 max-w-xs"
              >
                <p>
                  <strong>📌 {title}</strong>
                </p>
                <p>🕒 Start: {timeStart}</p>
                <p>⏳ End: {timeEnd}</p>
                {serviceUrl && (
                  <p className="text-center mt-2">
                    <a
                      href={serviceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Go to room
                    </a>
                  </p>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
