import { LoadingScreen } from "@/components/ui/loading-screen";

export default function DashboardLoading() {
  return (
    <LoadingScreen
      message="Loading Trade OS"
      subtitle="Fetching trade history, performance metrics & strategy adherence..."
      fullScreen={true}
    />
  );
}
