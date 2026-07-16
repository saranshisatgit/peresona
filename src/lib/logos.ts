import type { ImageProps } from 'next/image'

import logoAirbnb from '@/images/logos/airbnb.svg'
import logoAnimaginary from '@/images/logos/animaginary.svg'
import logoCosmos from '@/images/logos/cosmos.svg'
import logoFacebook from '@/images/logos/facebook.svg'
import logoHelioStream from '@/images/logos/helio-stream.svg'
import logoOpenShuttle from '@/images/logos/open-shuttle.svg'
import logoPlanetaria from '@/images/logos/planetaria.svg'
import logoStarbucks from '@/images/logos/starbucks.svg'

export const logoMap: Record<string, ImageProps['src']> = {
  planetaria: logoPlanetaria,
  airbnb: logoAirbnb,
  facebook: logoFacebook,
  starbucks: logoStarbucks,
  animaginary: logoAnimaginary,
  'helio-stream': logoHelioStream,
  cosmos: logoCosmos,
  'open-shuttle': logoOpenShuttle,
}

export const fallbackLogo = logoPlanetaria

export const availableLogoKeys = Object.keys(logoMap)

export function resolveLogo(keyOrUrl: string | undefined): { src: ImageProps['src']; isUrl: boolean } {
  if (!keyOrUrl) return { src: fallbackLogo, isUrl: false }
  if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/')) {
    return { src: keyOrUrl, isUrl: true }
  }
  const mapped = logoMap[keyOrUrl]
  return { src: mapped || fallbackLogo, isUrl: false }
}
