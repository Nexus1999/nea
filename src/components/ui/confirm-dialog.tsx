"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full ${isDestructive ? 'bg-red-100' : 'bg-orange-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                    <AlertTriangle className={`h-5 w-5 ${isDestructive ? 'text-red-600' : 'text-orange-600'}`} aria-hidden="true" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-lg px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white sm:w-auto transition-all ${
                    isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-gray-900 hover:bg-black shadow-gray-200'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-xl border border-gray-200 px-6 py-2.5 bg-white text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-gray-900 sm:w-auto transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;