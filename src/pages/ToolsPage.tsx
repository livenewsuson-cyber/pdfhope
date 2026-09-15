import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categories, tools } from '../data/tools'
import { ToolCard } from '../components/ToolCard'
import { useSeo } from '../hooks/useSeo'

export function ToolsPage(){useSeo('All PDF tools','Browse local browser-based tools for organizing, converting, editing, inspecting, and preparing PDFs.','/tools');const[params,setParams]=useSearchParams(),[query,setQuery]=useState(''),active=params.get('category')||'All';const visible=tools.filter((tool)=>(active==='All'||tool.category===active)&&`${tool.name} ${tool.short}`.toLowerCase().includes(query.toLowerCase()));return <main className="listing-page"><div className="listing-head"><span className="kicker">PDFHope toolkit</span><h1>Find your PDF tool</h1><p>Practical workflows that run locally in your browser.</p><label className="search-box"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search by task" aria-label="Search all PDF tools"/><span>{visible.length} results</span></label></div><div className="filter-row">{['All',...categories].map((category)=><button className={active===category?'active':''} key={category} onClick={()=>setParams(category==='All'?{}:{category})}>{category}</button>)}</div><div className="listing-grid">{visible.map((tool)=><ToolCard key={tool.slug} tool={tool} catalog/>)}</div>{!visible.length&&<div className="empty-state"><h2>No matching tool</h2><p>Try a broader phrase or another category.</p></div>}</main>}
