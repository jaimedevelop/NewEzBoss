interface WorkspaceTabBarProps<T extends string> {
  label: string;
  tabs: readonly { id: T; label: string; disabled?: boolean }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function WorkspaceTabBar<T extends string>({
  label, tabs, activeTab, onTabChange,
}: WorkspaceTabBarProps<T>) {
  return (
    <div role="group" aria-label={label} className="overflow-x-auto border-b border-gray-200 bg-white">
      <div className="flex w-max gap-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-2 py-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-orange-600
              ${activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : tab.disabled
                  ? 'cursor-not-allowed border-transparent text-gray-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
