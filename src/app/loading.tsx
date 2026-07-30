import { LoadingScreen } from "@/components/ui/loading-screen";

export default function GlobalLoading() {
  return (
    <LoadingScreen
      message="Loading Trader Brio"
      subtitle="Preparing your trading environment & live market data..."
      showTimer={true}
      fullScreen={true}
    />
  );
}
