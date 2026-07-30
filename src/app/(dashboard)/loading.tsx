import { LoadingScreen } from "@/components/ui/loading-screen";

export default function DashboardLoading() {
  return (
    <LoadingScreen
      message="Loading Trading OS"
      subtitle="Fetching trade history, performance metrics & strategy adherence..."
      showTimer={true}
      fullScreen={true}
    />
  );
}
