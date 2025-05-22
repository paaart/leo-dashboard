// src/components/Sidebar.tsx
type SidebarProps = {
  selected: "domestic" | "international" | "loans";
  onSelect: (tab: "domestic" | "international" | "loans") => void;
};

export default function Sidebar({ selected, onSelect }: SidebarProps) {
  const tabs = [
    { id: "domestic", label: "Domestic Calculator" },
    { id: "international", label: "International Calculator" },
    { id: "loans", label: "Loans / Advances" },
  ] as const;

  return (
    <aside className="w-64 hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6">
      <nav className="space-y-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
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
