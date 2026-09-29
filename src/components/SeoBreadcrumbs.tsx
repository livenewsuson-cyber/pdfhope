import { Link } from 'react-router-dom'
import { breadcrumbItems } from '../lib/breadcrumbs'

export function SeoBreadcrumbs({ path }: { path: string }) {
  const items = breadcrumbItems(path)
  return <nav className="tool-breadcrumb seo-breadcrumbs" aria-label="Breadcrumb">
    {items.map((item, index) => <span className="seo-breadcrumb-part" key={item.path}>
      {index > 0 && <span className="seo-breadcrumb-separator" aria-hidden="true">/</span>}
      {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link to={item.path}>{item.name}</Link>}
    </span>)}
  </nav>
}
