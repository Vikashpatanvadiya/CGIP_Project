// Module Owner: Krishna Patel (24000131) — Database & GUI
// Brand mark. Uses the markany logo (wordmark) and icon-only variants.

import logoUrl from '../../assets/markany-logo.png'
import iconUrl from '../../assets/markany-icon.png'

export function LogoMark({ className = 'h-7 w-7' }) {
  return <img src={iconUrl} alt="markany" className={className} draggable="false" />
}

export default function Logo({ className = 'h-7' }) {
  return <img src={logoUrl} alt="markany" className={className} draggable="false" />
}
