// src/components/Sidebar.tsx
type SidebarProps = {
  selected: "home" | "tasks" | "loans";
  onSelect: (tab: "home" | "tasks" | "loans") => void;
};

export default function Sidebar({ selected, onSelect }: SidebarProps) {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "tasks", label: "Tasks" },
    { id: "loans", label: "Loans / Advances" },
  ] as const;

  return (
    <aside className="w-64 hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6">
      <nav className="space-y-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
              selected === id
                ? "bg-gray-300 dark:bg-gray-700 font-semibold"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
