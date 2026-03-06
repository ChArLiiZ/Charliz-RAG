import { useAppStore } from "../stores/appStore";

const items = [
  { id: "chat", label: "Chat" },
  { id: "documents", label: "Documents" },
  { id: "settings", label: "Settings" },
] as const;

export function Sidebar() {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Desktop RAG</p>
        <h2>Workspace</h2>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={item.id === currentPage ? "nav-item active" : "nav-item"}
            onClick={() => setCurrentPage(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
