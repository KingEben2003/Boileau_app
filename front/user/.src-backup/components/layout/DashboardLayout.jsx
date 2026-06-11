import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

export default function DashboardLayout({
  children,
  currentSection,
  onSectionChange,
  selectedDocId,
  onSelectDoc,
  documents,
  onChallengeFriend,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#030712] text-white">
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
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
