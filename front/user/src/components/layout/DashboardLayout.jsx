import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import MobileNav from "./MobileNav";

export default function DashboardLayout({
  children,
  currentSection,
  onSectionChange,
  selectedDocId,
  onSelectDoc,
  documents,
  onChallengeFriend,
  searchQuery,
  onSearchChange,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-ink-900 text-white">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSection={currentSection}
        onSectionChange={onSectionChange}
        documents={documents}
        selectedDocId={selectedDocId}
        onSelectDoc={onSelectDoc}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          toggleSidebar={() => setSidebarOpen((o) => !o)}
          onSectionChange={onSectionChange}
          onChallengeFriend={onChallengeFriend}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 py-5 sm:px-5 sm:py-6 md:px-10 md:py-8 pb-mobile-nav md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav currentSection={currentSection} onSectionChange={onSectionChange} />
    </div>
  );
}
