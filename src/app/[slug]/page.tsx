import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params
  redirect(`/${slug}/book`)
}
