'use client'

import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { Sun, Moon, Globe } from 'lucide-react'

export function NavbarControls() {
  const { theme, toggleTheme } = useTheme()
  const { lang, toggleLang } = useLanguage()

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs">
      {/* Language Switcher */}
      <button
        onClick={toggleLang}
        type="button"
        aria-label="Toggle language"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{lang === 'th' ? 'TH' : 'EN'}</span>
      </button>

      {/* Theme Switcher */}
      <button
        onClick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
      >
        {theme === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
        )}
      </button>
    </div>
  )
}
