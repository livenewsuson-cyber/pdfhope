import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { routePages } from './lib/routePages'

const HomePage=routePages.HomePage.Component, ToolsPage=routePages.ToolsPage.Component, ToolPage=routePages.ToolPage.Component, InfoPage=routePages.InfoPage.Component, PdfReader=routePages.PdfReader.Component, PdfEditor=routePages.PdfEditor.Component, DocumentConversionPage=routePages.DocumentConversionPage.Component, NotFound=routePages.NotFound.Component

export default function App(){return <Suspense fallback={<div className="route-loader" role="status">Loading PDFHope…</div>}><Routes><Route element={<Layout/>}><Route index element={<HomePage/>}/><Route path="tools" element={<ToolsPage/>}/><Route path="pdf-reader" element={<PdfReader/>}/><Route path="edit-pdf" element={<PdfEditor/>}/><Route path="word-to-pdf" element={<DocumentConversionPage mode="word-to-pdf"/>}/><Route path="pdf-to-word" element={<DocumentConversionPage mode="pdf-to-word"/>}/>{['about','contact','privacy','privacy-policy','terms','cookie-policy','security','accessibility'].map((page)=><Route key={page} path={page} element={<InfoPage/>}/>)}<Route path="404" element={<NotFound/>}/><Route path=":slug" element={<ToolPage/>}/><Route path="*" element={<Navigate to="/404" replace/>}/></Route></Routes></Suspense>}
