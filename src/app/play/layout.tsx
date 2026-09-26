import { GameProvider } from "@/components/game-provider";
import { AppHeader } from "@/components/app-header";
import { AccountProvider } from "@/components/account-provider";
export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountProvider>
      <GameProvider>
        <AppHeader />
        {children}
      </GameProvider>
    </AccountProvider>
  );
}
