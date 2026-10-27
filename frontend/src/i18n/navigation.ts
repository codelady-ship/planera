import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/** Locale-aware Link, router and pathname: hrefs stay plain ("/search"), the prefix is added. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
