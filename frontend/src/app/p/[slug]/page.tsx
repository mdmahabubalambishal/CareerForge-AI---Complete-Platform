export default async function PublicPortfolio({ params }: { params: { slug: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/portfolio/public/${params.slug}`)
  if (!res.ok) return <div>Portfolio not found</div>
  const html = await res.text()
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}