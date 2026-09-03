'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Trash2, X } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  icon?: ReactNode
  badgeText?: string
  details?: ReactNode
  confirmVariant?: 'danger' | 'warning' | 'primary'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  icon,
  badgeText,
  details,
  confirmVariant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const isDanger = confirmVariant === 'danger'
  const isWarning = confirmVariant === 'warning'

  const iconBgClass = isDanger
    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
    : isWarning
      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'

  const confirmBtnClass = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
    : isWarning
      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
      : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className={`w-12 h-12 rounded-2xl ${iconBgClass} flex items-center justify-center mx-auto shadow-2xs`}>
            {icon || (isDanger ? <Trash2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />)}
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-1.5">
            {badgeText && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 mb-1">
                {badgeText}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Optional Details container */}
          {details && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              {details}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition shadow-md cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 ${confirmBtnClass}`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
