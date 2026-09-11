import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'

const HomePage=lazy(()=>import('./pages/HomePage').then((module)=>({default:module.HomePage})))
const ToolsPage=lazy(()=>import('./pages/ToolsPage').then((module)=>({default:module.ToolsPage})))
const ToolPage=lazy(()=>import('./pages/ToolPage').then((module)=>({default:module.ToolPage})))
const InfoPage=lazy(()=>import('./pages/InfoPage').then((module)=>({default:module.InfoPage})))
const PdfReader=lazy(()=>import('./pages/PdfReader').then((module)=>({default:module.PdfReader})))
const PdfEditor=lazy(()=>import('./pages/PdfEditor').then((module)=>({default:module.PdfEditor})))
const NotFound=lazy(()=>import('./pages/InfoPage').then((module)=>({default:module.NotFound})))

export default function App(){return <Suspense fallback={<div className="route-loader" role="status">Loading PDFHope…</div>}><Routes><Route element={<Layout/>}><Route index element={<HomePage/>}/><Route path="tools" element={<ToolsPage/>}/><Route path="pdf-reader" element={<PdfReader/>}/><Route path="edit-pdf" element={<PdfEditor/>}/>{['about','contact','privacy','privacy-policy','terms','cookie-policy','security','accessibility'].map((page)=><Route key={page} path={page} element={<InfoPage/>}/>)}<Route path="404" element={<NotFound/>}/><Route path=":slug" element={<ToolPage/>}/><Route path="*" element={<Navigate to="/404" replace/>}/></Route></Routes></Suspense>}

