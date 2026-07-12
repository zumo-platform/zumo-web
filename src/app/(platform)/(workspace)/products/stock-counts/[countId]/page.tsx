import { StockCountDetailView } from "@/components/workspace/stock-count-detail-view";

export const metadata = {
  title: "Conteo",
};

export default async function StockCountDetailPage({
  params,
}: Readonly<{
  params: Promise<{ countId: string }>;
}>) {
  const { countId } = await params;
  return <StockCountDetailView countId={decodeURIComponent(countId)} />;
}
