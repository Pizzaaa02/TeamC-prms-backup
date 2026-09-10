import { useEffect, useState } from 'react'
import { customizerApi } from '../api/customizer'
import { getFullUrl } from '../config/apiBaseUrl'

/**
 * Maps customizer DB fields to the CSS custom properties the layouts consume.
 *
 * customizer field         -> CSS variable(s)
 * ---------------------    -> --------------------------------
 * light_header_bg         -> --header-background-color  (sidebar bg)
 *                         -> --card-bg                  (topbar bg)
 * light_body_bg           -> --background-color         (shell bg)
 *                         -> --page-bg                  (inner page backgrounds)
 * light_accent_color      -> --primary-color            (active-gradient, avatar border)
 *                         -> --accent-color             (active-gradient)
 * light_footer_bg         -> --footer-background-color
 *
 * Dark variants applied the same way.
 *
 * Only the active theme's values are painted onto the shared CSS variables
 * so light/dark don't fight over the same slot.
 * A MutationObserver re-paints when the user toggles data-theme.
 */
const PAINT_MAP = [
  ['light_header_bg',  ['--header-background-color']],
  ['light_sidebar_bg', ['--sidebar-bg']],
  ['light_card_bg',    ['--card-bg']],
  ['light_body_bg',    ['--background-color', '--page-bg']],
  ['light_accent_color',['--primary-color', '--accent-color']],
  ['light_footer_bg',  ['--footer-background-color']],
  ['dark_header_bg',   ['--header-background-color']],
  ['dark_sidebar_bg',  ['--sidebar-bg']],
  ['dark_card_bg',     ['--card-bg']],
  ['dark_body_bg',     ['--background-color', '--page-bg']],
  ['dark_accent_color', ['--primary-color', '--accent-color']],
  ['dark_footer_bg',   ['--footer-background-color']],
]

function getTheme() {
  const theme = document.documentElement.getAttribute('data-theme')
  const appearance = localStorage.getItem('appearance')
  return theme === 'dark' ? 'dark' : (appearance === 'dark' ? 'dark' : 'light')
}

function paintTheme(data, theme) {
  const root = document.documentElement.style
  for (const [field, cssVars] of PAINT_MAP) {
    if (!field.startsWith(theme)) continue
    const value = data[field]
    if (value) {
      for (const cv of cssVars) {
        root.setProperty(cv, value)
      }
    }
  }
}

function useBranding() {
  const [name, setName] = useState('PRMS')
  const [logoUrl, setLogoUrl] = useState(null)
  const [colors, setColors] = useState({})

  useEffect(() => {
    let observer = null

    async function load() {
      try {
        const r = await customizerApi.getConfig()
        const data = r?.data ?? r
        if (!data) return

        if (data.company_name) setName(data.company_name)
        if (data.logo_url) {
          setLogoUrl(getFullUrl(data.logo_url))
        }

        /* ── Store full customizer payload ── */
        setColors(data)

        /* ── Paint active theme ── */
        paintTheme(data, getTheme())

        /* ── Re-paint when user toggles theme ── */
        observer = new MutationObserver(() => {
          paintTheme(data, getTheme())
        })
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        })
      } catch {
        // branding optional
      }
    }

    load()

    /* ── useEffect cleanup: disconnect the observer ── */
    return () => {
      if (observer) observer.disconnect()
    }
  }, [])

  return { name, logoUrl, colors }
}

export default useBranding
