import { createElement, lazy, type ComponentType, type ComponentProps } from 'react'
import { categoryHubByPath } from '../data/categoryHubs'

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
  CategoryPage: deferredPage(() => import('../pages/CategoryPage').then(module => ({ default: module.CategoryPage }))),
  ToolPage: deferredPage(() => import('../pages/ToolPage').then(module => ({ default: module.ToolPage }))),
  InfoPage: deferredPage(() => import('../pages/InfoPage').then(module => ({ default: module.InfoPage }))),
  PdfReader: deferredPage(() => import('../pages/PdfReader').then(module => ({ default: module.PdfReader }))),
  OcrPdfPage: deferredPage(() => import('../pages/OcrPdfPage').then(module => ({ default: module.OcrPdfPage }))),
  PdfEditor: deferredPage(() => import('../pages/PdfEditor').then(module => ({ default: module.PdfEditor }))),
  DocumentConversionPage: deferredPage(() => import('../pages/DocumentConversionPage').then(module => ({ default: module.DocumentConversionPage }))),
  HeaderFooterPage: deferredPage(() => import('../pages/HeaderFooterPage').then(module => ({ default: module.HeaderFooterPage }))),
  SecurityToolPage: deferredPage(() => import('../pages/SecurityToolPage').then(module => ({ default: module.SecurityToolPage }))),
  SignPdfPage: deferredPage(() => import('../pages/SignPdfPage').then(module => ({ default: module.SignPdfPage }))),
  NotFound: deferredPage(() => import('../pages/InfoPage').then(module => ({ default: module.NotFound }))),
}

export function preloadInitialPage(path: string) {
  const page = path === '/' ? 'HomePage' : path === '/tools' ? 'ToolsPage' : categoryHubByPath[path] ? 'CategoryPage' : path === '/pdf-reader' ? 'PdfReader' : path === '/ocr-pdf' ? 'OcrPdfPage' : path === '/edit-pdf' ? 'PdfEditor' : path === '/header-footer-pdf' ? 'HeaderFooterPage' : ['/protect-pdf', '/unlock-pdf'].includes(path) ? 'SecurityToolPage' : path === '/sign-pdf' ? 'SignPdfPage' : ['/word-to-pdf', '/pdf-to-word', '/excel-to-pdf', '/pdf-to-excel', '/powerpoint-to-pdf', '/pdf-to-powerpoint'].includes(path) ? 'DocumentConversionPage' : ['/about', '/contact', '/privacy', '/privacy-policy', '/terms', '/cookie-policy', '/security', '/accessibility'].includes(path) ? 'InfoPage' : path === '/404' ? 'NotFound' : 'ToolPage'
  return routePages[page].preload()
}
