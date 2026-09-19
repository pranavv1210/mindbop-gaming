import { GameProvider } from "@/components/game-provider";
import { AppHeader } from "@/components/app-header";
export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameProvider>
      <AppHeader />
      {children}
    </GameProvider>
  );
}
