import { createElement, lazy, type ComponentType, type ComponentProps } from 'react'

function deferredPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  const Lazy = lazy(load)
  let loaded: T | undefined
  return {
    Component: (props: ComponentProps<T>) => createElement(loaded || Lazy, props),
    preload: async () => { loaded = (await load()).default },
  }
}

export const routePages = {
  HomePage: deferredPage(() => import('../pages/HomePage').then(module => ({ default: module.HomePage }))),
  ToolsPage: deferredPage(() => import('../pages/ToolsPage').then(module => ({ default: module.ToolsPage }))),
  ToolPage: deferredPage(() => import('../pages/ToolPage').then(module => ({ default: module.ToolPage }))),
  InfoPage: deferredPage(() => import('../pages/InfoPage').then(module => ({ default: module.InfoPage }))),
  PdfReader: deferredPage(() => import('../pages/PdfReader').then(module => ({ default: module.PdfReader }))),
  PdfEditor: deferredPage(() => import('../pages/PdfEditor').then(module => ({ default: module.PdfEditor }))),
  DocumentConversionPage: deferredPage(() => import('../pages/DocumentConversionPage').then(module => ({ default: module.DocumentConversionPage }))),
  NotFound: deferredPage(() => import('../pages/InfoPage').then(module => ({ default: module.NotFound }))),
}

export function preloadInitialPage(path: string) {
  const page = path === '/' ? 'HomePage' : path === '/tools' ? 'ToolsPage' : path === '/pdf-reader' ? 'PdfReader' : path === '/edit-pdf' ? 'PdfEditor' : ['/word-to-pdf', '/pdf-to-word'].includes(path) ? 'DocumentConversionPage' : ['/about', '/contact', '/privacy', '/privacy-policy', '/terms', '/cookie-policy', '/security', '/accessibility'].includes(path) ? 'InfoPage' : path === '/404' ? 'NotFound' : 'ToolPage'
  return routePages[page].preload()
}
